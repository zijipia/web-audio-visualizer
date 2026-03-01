"use client";

import { useEffect, useRef } from "react";

export type VisualizationMode = "bars" | "waveform" | "circular" | "reflective" | "layered-wave";
export type SpectrumColorScheme = "sunset" | "neon" | "fire";

export interface SpectrumSettings {
	frequencyBands: number;
	startFrequency: number;
	endFrequency: number;
	sensitivity: number;
	thickness: number;
	softness: number;
	maxHeight: number;
	audioDurationMs: number;
	audioOffsetMs: number;
	radialBoost: number;
	rotationSpeed: number;
	glow: number;
	segmented: boolean;
	fallSpeed: number;
	colorScheme: SpectrumColorScheme;
	mirror: boolean;
	drawProgress: boolean;
	overlayText: string;
	overlayMode: "text" | "logo";
	overlayTextSize: number;
	overlayTextY: number;
	overlayTextOpacity: number;
	overlayTextX: number;
	overlayTextScale: number;
	overlayTextBlur: number;
	overlayTextWiggle: number;
	overlayTextReactStrength: number;
	overlayTextReactGlow: number;
	overlayTextReactMinHz: number;
	overlayTextReactMaxHz: number;
	backgroundScale: number;
	backgroundBlur: number;
	backgroundWiggle: number;
	backgroundX: number;
	backgroundY: number;
	backgroundReactStrength: number;
	backgroundGlow: number;
	backgroundReactMinHz: number;
	backgroundReactMaxHz: number;
	extensionEnabled: boolean;
	extensionSpectrumCode: string;
	extensionBackgroundCode: string;
	extensionTextCode: string;
}

interface ExtensionContext {
	ctx: CanvasRenderingContext2D;
	width: number;
	height: number;
	settings: SpectrumSettings;
	frequencyData: Uint8Array;
	visualData: Float32Array;
	timeData: Uint8Array;
	sampleRate: number;
	bassIntensity: number;
	textReact: number;
	backgroundReact: number;
	currentTime: number;
	duration: number;
	deltaMs: number;
	mode: VisualizationMode;
}

type ExtensionFunction = (context: ExtensionContext) => void;

export function compileExtensionSafe(code: string): ExtensionFunction | null {
	const trimmed = code.trim();
	if (!trimmed) return null;

	try {
		// Không cho truy cập global scope
		const factory = new Function(
			"context",
			`
			"use strict";
			
			// Hard block dangerous globals
			const window = undefined;
			const document = undefined;
			const globalThis = undefined;
			const self = undefined;
			const fetch = undefined;
			const XMLHttpRequest = undefined;
			const WebSocket = undefined;
			const Worker = undefined;
			const navigator = undefined;
			const location = undefined;
			const localStorage = undefined;
			const sessionStorage = undefined;
			const indexedDB = undefined;

			// Freeze prototypes (chống prototype pollution)
			Object.freeze(Object.prototype);
			Object.freeze(Function.prototype);
			Object.freeze(Array.prototype);

			${trimmed}
			`,
		);

		const fn: ExtensionFunction = (context) => {
			const start = performance.now();

			try {
				factory(context);

				// Guard thời gian frame
				if (performance.now() - start > 6) {
					throw new Error("Extension exceeded frame time budget");
				}
			} catch (err) {
				console.warn("[extension] runtime error", err);
				throw err;
			}
		};

		return fn;
	} catch (err) {
		console.warn("[extension] compile failed", err);
		return null;
	}
}

function compileExtension(code: string): ExtensionFunction | null {
	const trimmed = code.trim();
	if (!trimmed) return null;

	try {
		// const fn = new Function("context", `"use strict"; ${trimmed}`) as ExtensionFunction;
		const fn = compileExtensionSafe(code);

		return fn;
	} catch (error) {
		console.warn("[extension] Failed to compile custom code", error);
		return null;
	}
}

function getSmoothedLogData(data: Uint8Array, count: number, startIndex: number, endIndex: number, sensitivity: number): Float32Array {
	const result = new Float32Array(count);

	for (let i = 0; i < count; i++) {
		// Ánh xạ logarit
		const t = i / Math.max(1, count - 1);
		const logIndex = startIndex * Math.pow(endIndex / Math.max(1, startIndex), t);

		// Nội suy tuyến tính (Lerp) để xóa bỏ hiện tượng "vuông"
		const low = Math.floor(logIndex);
		const high = Math.min(data.length - 1, Math.ceil(logIndex));
		const fraction = logIndex - low;

		const rawValue = (data[low] ?? 0) * (1 - fraction) + (data[high] ?? 0) * fraction;

		// Áp dụng độ nhạy và làm nhọn đỉnh sóng (Power Scaling)
		let value = Math.min(1, (rawValue / 255) * sensitivity);
		result[i] = Math.pow(value, 1.1);
	}
	return result;
}

function getNormalizedData(data: Uint8Array, count: number, sampleRate: number, settings: SpectrumSettings): Float32Array {
	const visualData = new Float32Array(count);

	const minFreq = settings.startFrequency || 20;
	const maxFreq = settings.endFrequency || 15000;

	const fftSize = data.length * 2;
	const startIndex = Math.floor((minFreq * fftSize) / sampleRate);
	const endIndex = Math.floor((maxFreq * fftSize) / sampleRate);
	const range = endIndex - startIndex;

	if (range <= 0) return visualData;

	// Pass 1: log-spaced interpolation với multi-sample averaging để đỉnh tròn
	const raw = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		const t = i / Math.max(1, count - 1);
		const logIndex = startIndex * Math.pow(endIndex / Math.max(1, startIndex), t);

		// Lấy trung bình 3 điểm xung quanh để tránh spike đơn lẻ
		let sum = 0;
		for (let k = -1; k <= 1; k++) {
			const idx = Math.max(0, Math.min(data.length - 1, Math.round(logIndex) + k));
			sum += data[idx] ?? 0;
		}
		raw[i] = sum / 3;
	}

	// Pass 2: Gaussian smooth nhẹ để đỉnh tròn tự nhiên
	for (let i = 0; i < count; i++) {
		const prev2 = raw[Math.max(0, i - 2)] ?? 0;
		const prev1 = raw[Math.max(0, i - 1)] ?? 0;
		const curr = raw[i] ?? 0;
		const next1 = raw[Math.min(count - 1, i + 1)] ?? 0;
		const next2 = raw[Math.min(count - 1, i + 2)] ?? 0;
		const smoothed = prev2 * 0.06 + prev1 * 0.24 + curr * 0.4 + next1 * 0.24 + next2 * 0.06;

		// Normalize, sensitivity, power scale — clamp cuối cùng để không mất bass
		const value = (smoothed / 255) * settings.sensitivity;
		visualData[i] = Math.min(1, Math.pow(value, 1.15));
	}

	return visualData;
}
interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	size: number;
	alpha: number;
	hue: number;
}

interface VisualizationCanvasProps {
	frequencyData: Uint8Array;
	timeData: Uint8Array;
	sampleRate: number;
	mode: VisualizationMode;
	duration: number;
	currentTime: number;
	onSeek: (time: number) => void;
	onExportCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
	settings: SpectrumSettings;
	bassIntensity: number;
	backgroundImage: string | null;
	overlayImage: string | null;
}

function resolveFrequencyRange(data: Float32Array | Uint8Array, sampleRate: number, settings: SpectrumSettings) {
	const nyquist = sampleRate / 2;
	const boundedStart = Math.max(0, Math.min(settings.startFrequency, nyquist));
	const boundedEnd = Math.max(boundedStart + 1, Math.min(settings.endFrequency, nyquist));

	const startIndex = Math.floor((boundedStart / nyquist) * data.length);
	const endIndex = Math.max(startIndex + 1, Math.floor((boundedEnd / nyquist) * data.length));

	return {
		startIndex,
		endIndex: Math.min(data.length, endIndex),
	};
}

function createGradient(ctx: CanvasRenderingContext2D, width: number, height: number, scheme: SpectrumColorScheme) {
	const gradient = ctx.createLinearGradient(0, 0, width, height);

	if (scheme === "neon") {
		gradient.addColorStop(0, "#22d3ee");
		gradient.addColorStop(0.5, "#a78bfa");
		gradient.addColorStop(1, "#f472b6");
		return gradient;
	}

	if (scheme === "fire") {
		gradient.addColorStop(0, "#facc15");
		gradient.addColorStop(0.5, "#f97316");
		gradient.addColorStop(1, "#ef4444");
		return gradient;
	}

	gradient.addColorStop(0, "#fb923c");
	gradient.addColorStop(0.5, "#f59e0b");
	gradient.addColorStop(1, "#06b6d4");
	return gradient;
}

function resolveBandEnergy(data: Float32Array, sampleRate: number, minHz: number, maxHz: number, sensitivity = 1) {
	if (!data.length) return 0;
	const nyquist = sampleRate / 2;
	const safeMin = Math.max(0, Math.min(minHz, nyquist));
	const safeMax = Math.max(safeMin + 1, Math.min(maxHz, nyquist));
	const start = Math.floor((safeMin / nyquist) * data.length);
	const end = Math.max(start + 1, Math.floor((safeMax / nyquist) * data.length));

	let sum = 0;
	for (let i = start; i < end; i += 1) sum += data[i] ?? 0;
	const average = sum / Math.max(1, end - start);
	// visualData is already normalized 0-1 (Float32Array), no need to divide by 255
	return Math.max(0, Math.min(1, average * sensitivity));
}

function drawBackground(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	bassIntensity: number,
	backgroundReact: number,
	bgImage: HTMLImageElement | null,
	settings: SpectrumSettings,
	smoothBassRef: { current: number },
	particles: Particle[],
	deltaMs: number,
) {
	smoothBassRef.current += (bassIntensity - smoothBassRef.current) * 0.12;
	const smoothBass = smoothBassRef.current;

	ctx.save();
	ctx.fillStyle = "#050812";
	ctx.fillRect(0, 0, width, height);

	const react = Math.max(0, Math.min(1, backgroundReact));
	const wiggleX = Math.sin(performance.now() * 0.005) * settings.backgroundWiggle * (0.3 + react);
	const wiggleY = Math.cos(performance.now() * 0.0065) * settings.backgroundWiggle * (0.3 + react);

	if (bgImage) {
		const scale = settings.backgroundScale + react * settings.backgroundReactStrength;
		const drawWidth = width * scale;
		const drawHeight = height * scale;
		const x = (width - drawWidth) / 2 + settings.backgroundX + wiggleX;
		const y = (height - drawHeight) / 2 + settings.backgroundY + wiggleY;

		ctx.globalAlpha = 0.56 + smoothBass * 0.18;
		ctx.filter = `brightness(${0.5 + smoothBass * 0.35 + react * 0.2}) saturate(${1.05 + smoothBass * 0.35 + react * 0.35}) blur(${settings.backgroundBlur + react * settings.backgroundBlur * 0.6}px)`;
		ctx.drawImage(bgImage, x, y, drawWidth, drawHeight);
		ctx.filter = "none";
		ctx.globalAlpha = 1;
	} else {
		const bgGradient = ctx.createLinearGradient(0, 0, width, height);
		bgGradient.addColorStop(0, "#0a0e27");
		bgGradient.addColorStop(0.45, "#111833");
		bgGradient.addColorStop(1, "#0d132d");
		ctx.fillStyle = bgGradient;
		ctx.fillRect(0, 0, width, height);
	}

	ctx.fillStyle = `rgba(5, 8, 18, ${0.52 - smoothBass * 0.24})`;
	ctx.fillRect(0, 0, width, height);

	const pulse = ctx.createRadialGradient(width * 0.5, height * 0.45, width * 0.08, width * 0.5, height * 0.45, width * 0.7);
	pulse.addColorStop(0, `rgba(251, 146, 60, ${0.14 + smoothBass * 0.35 + react * settings.backgroundGlow * 0.5})`);
	pulse.addColorStop(0.3, `rgba(245, 158, 11, ${0.09 + smoothBass * 0.2})`);
	pulse.addColorStop(0.8, "rgba(2, 132, 199, 0.04)");
	pulse.addColorStop(1, "rgba(2, 132, 199, 0)");
	ctx.fillStyle = pulse;
	ctx.fillRect(0, 0, width, height);

	const spawnCount = Math.floor((deltaMs / 16.67) * (0.5 + smoothBass * 2.2));
	for (let i = 0; i < spawnCount; i += 1) {
		if (particles.length > 280) break;
		particles.push({
			x: Math.random() * width,
			y: height + Math.random() * 30,
			vx: (Math.random() - 0.5) * (0.18 + smoothBass * 0.85),
			vy: -(0.45 + Math.random() * 1.45 + smoothBass * 2.2),
			size: 0.8 + Math.random() * (1.6 + smoothBass * 2.6),
			alpha: 0.2 + Math.random() * (0.3 + smoothBass * 0.3),
			hue: 25 + Math.random() * 190,
		});
	}

	for (let i = particles.length - 1; i >= 0; i -= 1) {
		const particle = particles[i];
		particle.x += particle.vx * (deltaMs / 16.67);
		particle.y += particle.vy * (deltaMs / 16.67);
		particle.alpha -= 0.0045 * (deltaMs / 16.67);

		if (particle.alpha <= 0 || particle.y < -20) {
			particles.splice(i, 1);
			continue;
		}

		ctx.beginPath();
		ctx.fillStyle = `hsla(${particle.hue}, 95%, 65%, ${particle.alpha})`;
		ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.restore();
}

function drawBars(ctx: CanvasRenderingContext2D, visualData: Float32Array, width: number, height: number, settings: SpectrumSettings, displayState: Float32Array, deltaMs: number) {
	const count = visualData.length;
	const barWidth = width / count;
	const maxH = height * (settings.maxHeight / 1000);
	const decay = (settings.fallSpeed * deltaMs) / 16.67;

	ctx.fillStyle = createGradient(ctx, 0, height, settings.colorScheme);

	for (let i = 0; i < count; i++) {
		// Cập nhật trạng thái rơi mượt mà
		const target = visualData[i] * maxH;
		const current = Math.max(target, (displayState[i] || 0) - decay);
		displayState[i] = current;

		const x = i * barWidth;
		const barH = Math.max(2, current);
		ctx.fillRect(x, height - barH, barWidth - settings.thickness, barH);
	}
}

function drawWaveform(ctx: CanvasRenderingContext2D, data: Uint8Array, width: number, height: number, settings: SpectrumSettings) {
	ctx.fillStyle = "rgba(10,14,39,0.16)";
	ctx.fillRect(0, 0, width, height);

	ctx.strokeStyle = createGradient(ctx, width, 0, settings.colorScheme);
	ctx.lineWidth = settings.thickness;
	ctx.shadowColor = settings.glow ? "rgba(34,211,238,0.9)" : "transparent";
	ctx.shadowBlur = settings.glow;
	ctx.beginPath();

	const sliceWidth = width / data.length;
	const center = height / 2;
	for (let i = 0; i < data.length; i += 1) {
		const normalized = ((data[i] ?? 128) - 128) / 128;
		const y = center + normalized * center * Math.min(1.3, settings.maxHeight / 1000);
		const x = i * sliceWidth;

		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}

	ctx.stroke();
	ctx.shadowBlur = 0;
}

function drawCircular(ctx: CanvasRenderingContext2D, data: Float32Array, width: number, height: number, sampleRate: number, settings: SpectrumSettings) {
	// visualData is already log-mapped & normalized — use directly
	const dataLen = data.length;
	const bars = Math.max(64, Math.min(240, settings.frequencyBands * 2));

	ctx.fillStyle = `rgba(10,14,39,${0.12 + (1 - settings.softness) * 0.2})`;
	ctx.fillRect(0, 0, width, height);

	const cx = width / 2;
	const cy = height / 2;
	const minDim = Math.min(cx, cy);

	const baseRadius = minDim * 0.38;
	const maxAmp = minDim * Math.min(0.45, 0.15 + settings.maxHeight / 2000);

	const spin = (performance.now() / 1000) * settings.rotationSpeed;

	ctx.save();
	ctx.translate(cx, cy);
	ctx.rotate(spin);

	const angleStep = (Math.PI * 2) / bars;
	const gapFraction = settings.segmented ? 0.35 : 0.15;
	const barArcWidth = angleStep * (1 - gapFraction);

	ctx.lineCap = "round";

	const sweep = Math.PI * 2;

	function getEnergy(index: number): number {
		let e = data[Math.min(data.length - 1, index)] ?? 0;
		e = Math.pow(Math.min(1, e * settings.sensitivity), 0.7);
		return e;
	}

	function drawBar(angle: number, energy: number, hueOverride?: number) {
		const amp = energy * maxAmp;
		if (amp < 0.5) return;

		const r1 = baseRadius;
		const r2 = baseRadius + amp;

		const hue =
			hueOverride !== undefined ? hueOverride
			: settings.colorScheme === "neon" ? ((angle / sweep) * 360 + 180) % 360
			: settings.colorScheme === "fire" ? 10 + energy * 50
			: ((angle / sweep) * 360) % 360;

		const lightness = 52 + energy * 22;
		const alpha = 0.5 + energy * 0.5;

		ctx.strokeStyle = `hsla(${hue},92%,${lightness}%,${alpha})`;
		ctx.shadowColor = settings.glow ? `hsla(${hue},100%,65%,${0.6 + energy * 0.35})` : "transparent";
		ctx.shadowBlur = settings.glow ? settings.glow * (0.8 + energy * 0.8) : 0;

		ctx.beginPath();
		ctx.arc(0, 0, (r1 + r2) / 2, angle - barArcWidth / 2, angle + barArcWidth / 2);
		ctx.lineWidth = r2 - r1;
		ctx.stroke();
	}

	if (settings.mirror) {
		const barsPerSide = Math.floor(bars / 2);
		for (let i = 0; i < barsPerSide; i += 1) {
			const rel = i / barsPerSide;
			const idx1 = Math.floor(rel * (dataLen - 1));
			const idx2 = Math.floor((1 - rel) * (dataLen - 1));

			const e1 = getEnergy(idx1);
			const e2 = getEnergy(idx2);

			const a1 = (i / barsPerSide) * sweep - Math.PI / 2;
			const a2 = ((i + barsPerSide) / bars) * sweep - Math.PI / 2;

			const hue1 =
				settings.colorScheme === "neon" ? (rel * 360 + 180) % 360
				: settings.colorScheme === "fire" ? 10 + e1 * 50
				: (rel * 360) % 360;
			const hue2 =
				settings.colorScheme === "neon" ? ((1 - rel) * 360 + 180) % 360
				: settings.colorScheme === "fire" ? 10 + e2 * 50
				: ((1 - rel) * 360) % 360;

			drawBar(a1, e1, hue1);
			drawBar(a2, e2, hue2);
		}
	} else {
		for (let i = 0; i < bars; i += 1) {
			const rel = i / bars;
			const index = Math.floor(rel * (dataLen - 1));
			const energy = getEnergy(index);
			const angle = rel * sweep - Math.PI / 2;

			const hue =
				settings.colorScheme === "neon" ? (rel * 360 + 180) % 360
				: settings.colorScheme === "fire" ? 10 + energy * 50
				: (rel * 360) % 360;

			drawBar(angle, energy, hue);
		}
	}

	// Inner ring
	ctx.shadowBlur = 0;
	ctx.strokeStyle = "rgba(255,255,255,0.08)";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.arc(0, 0, baseRadius - 2, 0, Math.PI * 2);
	ctx.stroke();

	ctx.restore();
}

function drawReflectiveSpectrum(ctx: CanvasRenderingContext2D, data: Float32Array, width: number, height: number, sampleRate: number, settings: SpectrumSettings) {
	// visualData is already log-mapped, normalized & smoothed by getNormalizedData
	const count = data.length;
	const baseline = height * 0.55;
	const maxAmp = height * Math.max(0.12, settings.maxHeight / 1100);

	ctx.fillStyle = "rgba(8,13,30,0.18)";
	ctx.fillRect(0, 0, width, height);

	// Build point array — data already smooth, no additional kernel needed
	const pts: { x: number; y: number }[] = [];
	for (let i = 0; i < count; i++) {
		const v = data[i] ?? 0;
		pts.push({ x: (i / (count - 1)) * width, y: baseline - v * maxAmp });
	}

	// Helper: draw smooth Catmull-Rom bezier path
	function drawSmoothPath() {
		ctx.moveTo(pts[0].x, pts[0].y);
		for (let i = 0; i < pts.length - 1; i++) {
			const p0 = pts[Math.max(0, i - 1)];
			const p1 = pts[i];
			const p2 = pts[i + 1];
			const p3 = pts[Math.min(pts.length - 1, i + 2)];
			const cp1x = p1.x + (p2.x - p0.x) / 6;
			const cp1y = p1.y + (p2.y - p0.y) / 6;
			const cp2x = p2.x - (p3.x - p1.x) / 6;
			const cp2y = p2.y - (p3.y - p1.y) / 6;
			ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
		}
	}

	// Gradient fill: use colorScheme-aware colors
	const fillGrad = ctx.createLinearGradient(0, baseline - maxAmp, 0, baseline);
	if (settings.colorScheme === "neon") {
		fillGrad.addColorStop(0, "rgba(167,139,250,0.9)");
		fillGrad.addColorStop(0.5, "rgba(34,211,238,0.75)");
		fillGrad.addColorStop(1, "rgba(244,114,182,0.6)");
	} else if (settings.colorScheme === "fire") {
		fillGrad.addColorStop(0, "rgba(250,204,21,0.92)");
		fillGrad.addColorStop(0.5, "rgba(249,115,22,0.8)");
		fillGrad.addColorStop(1, "rgba(239,68,68,0.65)");
	} else {
		fillGrad.addColorStop(0, "rgba(255,255,255,0.92)");
		fillGrad.addColorStop(0.5, "rgba(200,220,240,0.78)");
		fillGrad.addColorStop(1, "rgba(6,182,212,0.55)");
	}

	const strokeGrad = ctx.createLinearGradient(0, 0, width, 0);
	if (settings.colorScheme === "neon") {
		strokeGrad.addColorStop(0, "#f472b6");
		strokeGrad.addColorStop(0.5, "#a78bfa");
		strokeGrad.addColorStop(1, "#22d3ee");
	} else if (settings.colorScheme === "fire") {
		strokeGrad.addColorStop(0, "#ef4444");
		strokeGrad.addColorStop(0.5, "#f97316");
		strokeGrad.addColorStop(1, "#facc15");
	} else {
		strokeGrad.addColorStop(0, "#fb923c");
		strokeGrad.addColorStop(0.5, "#f8fafc");
		strokeGrad.addColorStop(1, "#22d3ee");
	}

	// Fill shape
	ctx.beginPath();
	ctx.moveTo(0, baseline);
	drawSmoothPath();
	ctx.lineTo(width, baseline);
	ctx.closePath();
	ctx.fillStyle = fillGrad;
	ctx.fill();

	// Top stroke line
	ctx.beginPath();
	drawSmoothPath();
	ctx.strokeStyle = strokeGrad;
	ctx.lineWidth = Math.max(1.5, settings.thickness * 0.65);
	ctx.shadowColor =
		settings.colorScheme === "neon" ? "rgba(167,139,250,0.7)"
		: settings.colorScheme === "fire" ? "rgba(249,115,22,0.7)"
		: "rgba(255,255,255,0.6)";
	ctx.shadowBlur = settings.glow * 0.9;
	ctx.stroke();
	ctx.shadowBlur = 0;

	// Baseline divider
	ctx.strokeStyle = "rgba(247,250,255,0.55)";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(0, baseline);
	ctx.lineTo(width, baseline);
	ctx.stroke();

	// Reflection (below baseline, flipped + faded)
	ctx.save();
	ctx.beginPath();
	ctx.rect(0, baseline, width, height - baseline);
	ctx.clip();
	ctx.translate(0, baseline * 2);
	ctx.scale(1, -1);

	ctx.beginPath();
	ctx.moveTo(0, baseline);
	drawSmoothPath();
	ctx.lineTo(width, baseline);
	ctx.closePath();

	const refGrad = ctx.createLinearGradient(0, baseline - maxAmp, 0, baseline);
	refGrad.addColorStop(0, "rgba(255,255,255,0.28)");
	refGrad.addColorStop(0.5, "rgba(200,220,240,0.12)");
	refGrad.addColorStop(1, "rgba(10,14,39,0)");
	ctx.fillStyle = refGrad;
	ctx.filter = "blur(3px)";
	ctx.fill();
	ctx.restore();
	ctx.filter = "none";
}

function drawLayeredWaveSpectrum(ctx: CanvasRenderingContext2D, data: Float32Array, width: number, height: number, sampleRate: number, settings: SpectrumSettings) {
	// visualData is already log-mapped & normalized (0-1) — use directly
	const count = data.length;
	const baseline = height * 0.68;
	const maxAmp = height * Math.max(0.1, settings.maxHeight / 1200);

	ctx.fillStyle = "rgba(9,14,36,0.14)";
	ctx.fillRect(0, 0, width, height);

	// Gaussian smooth
	const smooth = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		let sum = 0,
			w = 0;
		for (let k = -4; k <= 4; k++) {
			const j = Math.max(0, Math.min(count - 1, i + k));
			const wk = Math.exp(-0.4 * k * k);
			sum += (data[j] ?? 0) * wk;
			w += wk;
		}
		smooth[i] = sum / w;
	}

	// Color schemes for layers
	type LayerDef = { ampScale: number; phase: number; alpha: number; color: string; strokeColor: string };
	let layers: LayerDef[];
	const t = performance.now();

	if (settings.colorScheme === "neon") {
		layers = [
			{ ampScale: 0.55, phase: 2.1, alpha: 0.55, color: "rgba(244,114,182,0.75)", strokeColor: "rgba(244,114,182,0.9)" },
			{ ampScale: 0.75, phase: 1.05, alpha: 0.65, color: "rgba(167,139,250,0.82)", strokeColor: "rgba(167,139,250,0.95)" },
			{ ampScale: 1.0, phase: 0, alpha: 0.88, color: "rgba(34,211,238,0.88)", strokeColor: "rgba(34,211,238,1)" },
		];
	} else if (settings.colorScheme === "fire") {
		layers = [
			{ ampScale: 0.55, phase: 2.1, alpha: 0.55, color: "rgba(239,68,68,0.72)", strokeColor: "rgba(239,68,68,0.9)" },
			{ ampScale: 0.75, phase: 1.05, alpha: 0.65, color: "rgba(249,115,22,0.8)", strokeColor: "rgba(249,115,22,0.95)" },
			{ ampScale: 1.0, phase: 0, alpha: 0.88, color: "rgba(250,204,21,0.88)", strokeColor: "rgba(250,204,21,1)" },
		];
	} else {
		layers = [
			{ ampScale: 0.55, phase: 2.1, alpha: 0.55, color: "rgba(6,182,212,0.7)", strokeColor: "rgba(6,182,212,0.9)" },
			{ ampScale: 0.75, phase: 1.05, alpha: 0.65, color: "rgba(251,146,60,0.78)", strokeColor: "rgba(251,146,60,0.95)" },
			{ ampScale: 1.0, phase: 0, alpha: 0.9, color: "rgba(248,250,252,0.92)", strokeColor: "rgba(255,255,255,1)" },
		];
	}

	function buildPts(ampScale: number, phase: number): { x: number; y: number }[] {
		const pts: { x: number; y: number }[] = [];
		for (let i = 0; i < count; i++) {
			const x = (i / (count - 1)) * width;
			const wobble = Math.sin((i / count) * Math.PI * 5 + t * 0.00075 + phase) * maxAmp * ampScale * 0.12;
			const y = baseline - (smooth[i] ?? 0) * maxAmp * ampScale - wobble;
			pts.push({ x, y });
		}
		return pts;
	}

	function drawBezierFill(pts: { x: number; y: number }[], fillStyle: string | CanvasGradient, alpha: number) {
		ctx.beginPath();
		ctx.moveTo(0, baseline);
		ctx.lineTo(pts[0].x, pts[0].y);
		for (let i = 0; i < pts.length - 1; i++) {
			const p0 = pts[Math.max(0, i - 1)];
			const p1 = pts[i];
			const p2 = pts[i + 1];
			const p3 = pts[Math.min(pts.length - 1, i + 2)];
			const cp1x = p1.x + (p2.x - p0.x) / 6;
			const cp1y = p1.y + (p2.y - p0.y) / 6;
			const cp2x = p2.x - (p3.x - p1.x) / 6;
			const cp2y = p2.y - (p3.y - p1.y) / 6;
			ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
		}
		ctx.lineTo(width, baseline);
		ctx.closePath();
		ctx.globalAlpha = alpha;
		ctx.fillStyle = fillStyle;
		ctx.fill();
	}

	function drawBezierStroke(pts: { x: number; y: number }[], strokeColor: string) {
		ctx.beginPath();
		ctx.moveTo(pts[0].x, pts[0].y);
		for (let i = 0; i < pts.length - 1; i++) {
			const p0 = pts[Math.max(0, i - 1)];
			const p1 = pts[i];
			const p2 = pts[i + 1];
			const p3 = pts[Math.min(pts.length - 1, i + 2)];
			ctx.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
		}
		ctx.strokeStyle = strokeColor;
		ctx.lineWidth = Math.max(1.5, settings.thickness * 0.6);
		ctx.shadowBlur = settings.glow * 0.85;
		ctx.stroke();
		ctx.shadowBlur = 0;
	}

	// Draw back-to-front layers
	for (const layer of layers) {
		const pts = buildPts(layer.ampScale, layer.phase);

		// Vertical gradient per layer for depth
		const grad = ctx.createLinearGradient(0, baseline - maxAmp * layer.ampScale, 0, baseline);
		grad.addColorStop(0, layer.color);
		grad.addColorStop(1, layer.color.replace(/[\d.]+\)$/, "0)"));

		ctx.shadowColor = layer.strokeColor;
		drawBezierFill(pts, grad, layer.alpha);
		ctx.globalAlpha = 1;

		drawBezierStroke(pts, layer.strokeColor);
	}

	ctx.globalAlpha = 1;
	ctx.shadowBlur = 0;
}

function drawOverlayText(ctx: CanvasRenderingContext2D, width: number, height: number, settings: SpectrumSettings, bassIntensity: number, textReact: number) {
	const text = settings.overlayText.trim();
	if (!text) return;

	const size = Math.max(16, settings.overlayTextSize);
	const y = Math.max(40, Math.min(height - 24, settings.overlayTextY));
	const x = width / 2 + settings.overlayTextX;
	const alpha = Math.max(0, Math.min(1, settings.overlayTextOpacity));
	const react = Math.max(0, Math.min(1, textReact));
	const pulse = 0.82 + bassIntensity * 0.3 + react * settings.overlayTextReactStrength * 0.25;
	const dynamicScale = settings.overlayTextScale + react * settings.overlayTextReactStrength;
	const wiggle = settings.overlayTextWiggle * react;
	const wiggleX = Math.sin(performance.now() * 0.01) * wiggle;
	const wiggleY = Math.cos(performance.now() * 0.012) * wiggle;

	ctx.save();
	ctx.translate(x + wiggleX, y + wiggleY);
	ctx.scale(dynamicScale, dynamicScale);
	ctx.font = `700 ${size}px Inter, system-ui, sans-serif`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.filter = `blur(${settings.overlayTextBlur + react * settings.overlayTextBlur * 0.7}px)`;
	ctx.shadowColor = `rgba(34, 211, 238, ${0.35 + bassIntensity * 0.4 + react * settings.overlayTextReactGlow * 0.6})`;
	ctx.shadowBlur = 14 + bassIntensity * 24 + react * settings.overlayTextReactGlow * 36;
	ctx.fillStyle = `rgba(241, 245, 249, ${alpha * pulse})`;
	ctx.fillText(text, 0, 0);
	ctx.restore();
}

function drawOverlayLogo(ctx: CanvasRenderingContext2D, width: number, height: number, settings: SpectrumSettings, bassIntensity: number, textReact: number, logoImage: HTMLImageElement | null) {
	if (!logoImage) return;

	const y = Math.max(40, Math.min(height - 24, settings.overlayTextY));
	const x = width / 2 + settings.overlayTextX;
	const alpha = Math.max(0, Math.min(1, settings.overlayTextOpacity));
	const react = Math.max(0, Math.min(1, textReact));
	const dynamicScale = settings.overlayTextScale + react * settings.overlayTextReactStrength;
	const wiggle = settings.overlayTextWiggle * react;
	const wiggleX = Math.sin(performance.now() * 0.01) * wiggle;
	const wiggleY = Math.cos(performance.now() * 0.012) * wiggle;

	const aspectRatio = logoImage.naturalWidth / Math.max(1, logoImage.naturalHeight);
	const baseHeight = Math.max(24, settings.overlayTextSize);
	const drawHeight = baseHeight;
	const drawWidth = drawHeight * aspectRatio;

	ctx.save();
	ctx.translate(x + wiggleX, y + wiggleY);
	ctx.scale(dynamicScale, dynamicScale);
	ctx.globalAlpha = alpha;
	ctx.filter = `blur(${settings.overlayTextBlur + react * settings.overlayTextBlur * 0.7}px)`;
	ctx.shadowColor = `rgba(34, 211, 238, ${0.35 + bassIntensity * 0.4 + react * settings.overlayTextReactGlow * 0.6})`;
	ctx.shadowBlur = 14 + bassIntensity * 24 + react * settings.overlayTextReactGlow * 36;
	ctx.drawImage(logoImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
	ctx.restore();
}

function drawProgress(ctx: CanvasRenderingContext2D, width: number, height: number, duration: number, currentTime: number) {
	if (!duration) return;
	const progress = Math.max(0, Math.min(1, currentTime / duration));

	ctx.fillStyle = "rgba(15,23,42,0.65)";
	ctx.fillRect(0, height - 8, width, 8);

	const gradient = ctx.createLinearGradient(0, 0, width, 0);
	gradient.addColorStop(0, "#f97316");
	gradient.addColorStop(1, "#06b6d4");
	ctx.fillStyle = gradient;
	ctx.fillRect(0, height - 8, width * progress, 8);
}

export function VisualizationCanvas({ frequencyData, timeData, sampleRate, mode, duration, currentTime, onSeek, onExportCanvasReady, settings, bassIntensity, backgroundImage, overlayImage }: VisualizationCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const barDisplayStateRef = useRef<Float32Array>(new Float32Array(512));
	const lastFrameTimeRef = useRef<number>(performance.now());
	const smoothBassRef = useRef<number>(0);
	const imageRef = useRef<HTMLImageElement | null>(null);
	const overlayImageRef = useRef<HTMLImageElement | null>(null);
	const screenParticlesRef = useRef<Particle[]>([]);
	const exportParticlesRef = useRef<Particle[]>([]);
	const spectrumExtensionRef = useRef<ExtensionFunction | null>(null);
	const backgroundExtensionRef = useRef<ExtensionFunction | null>(null);
	const textExtensionRef = useRef<ExtensionFunction | null>(null);
	const extensionErrorRef = useRef({ spectrum: false, background: false, text: false });

	useEffect(() => {
		spectrumExtensionRef.current = compileExtension(settings.extensionSpectrumCode);
		extensionErrorRef.current.spectrum = false;
	}, [settings.extensionSpectrumCode]);

	useEffect(() => {
		backgroundExtensionRef.current = compileExtension(settings.extensionBackgroundCode);
		extensionErrorRef.current.background = false;
	}, [settings.extensionBackgroundCode]);

	useEffect(() => {
		textExtensionRef.current = compileExtension(settings.extensionTextCode);
		extensionErrorRef.current.text = false;
	}, [settings.extensionTextCode]);

	useEffect(() => {
		if (!backgroundImage) {
			imageRef.current = null;
			return;
		}

		const image = new Image();
		image.decoding = "async";
		image.src = backgroundImage;
		imageRef.current = image;
	}, [backgroundImage]);

	useEffect(() => {
		if (!overlayImage) {
			overlayImageRef.current = null;
			return;
		}

		const image = new Image();
		image.decoding = "async";
		image.src = overlayImage;
		overlayImageRef.current = image;
	}, [overlayImage]);

	useEffect(() => {
		const exportCanvas = document.createElement("canvas");
		exportCanvas.width = 1920;
		exportCanvas.height = 1080;
		exportCanvasRef.current = exportCanvas;
		onExportCanvasReady?.(exportCanvas);

		return () => onExportCanvasReady?.(null);
	}, [onExportCanvasReady]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const context = canvas.getContext("2d");
		const exportContext = exportCanvasRef.current?.getContext("2d");
		if (!context || !exportContext) return;

		let frame = 0;

		const renderFrame = () => {
			const dpr = window.devicePixelRatio || 1;
			const displayWidth = Math.floor(canvas.clientWidth);
			const displayHeight = Math.floor(canvas.clientHeight);

			if (canvas.width !== Math.floor(displayWidth * dpr) || canvas.height !== Math.floor(displayHeight * dpr)) {
				canvas.width = Math.floor(displayWidth * dpr);
				canvas.height = Math.floor(displayHeight * dpr);
			}

			context.setTransform(dpr, 0, 0, dpr, 0, 0);

			const now = performance.now();
			const deltaMs = Math.max(1, now - lastFrameTimeRef.current);
			lastFrameTimeRef.current = now;
			const visualData = getNormalizedData(frequencyData, settings.frequencyBands, sampleRate, settings);

			const draw = (ctx: CanvasRenderingContext2D, width: number, height: number, particles: Particle[]) => {
				ctx.clearRect(0, 0, width, height);
				const textReact = resolveBandEnergy(visualData, sampleRate, settings.overlayTextReactMinHz, settings.overlayTextReactMaxHz, settings.sensitivity);
				const backgroundReact = resolveBandEnergy(visualData, sampleRate, settings.backgroundReactMinHz, settings.backgroundReactMaxHz, settings.sensitivity);

				drawBackground(ctx, width, height, bassIntensity, backgroundReact, imageRef.current, settings, smoothBassRef, particles, deltaMs);

				const extensionContext: ExtensionContext = {
					ctx,
					width,
					height,
					settings,
					frequencyData,
					visualData,
					timeData,
					sampleRate,
					bassIntensity,
					textReact,
					backgroundReact,
					currentTime,
					duration,
					deltaMs,
					mode,
				};

				if (settings.extensionEnabled && backgroundExtensionRef.current && !extensionErrorRef.current.background) {
					try {
						backgroundExtensionRef.current(extensionContext);
					} catch (error) {
						extensionErrorRef.current.background = true;
						console.warn("[extension] Background code runtime error", error);
					}
				}

				if (mode === "bars") {
					drawBars(ctx, visualData, width, height, settings, barDisplayStateRef.current, deltaMs);
				} else if (mode === "waveform") {
					drawWaveform(ctx, timeData, width, height, settings);
				} else if (mode === "reflective") {
					drawReflectiveSpectrum(ctx, visualData, width, height, sampleRate, settings);
				} else if (mode === "layered-wave") {
					drawLayeredWaveSpectrum(ctx, visualData, width, height, sampleRate, settings);
				} else {
					drawCircular(ctx, visualData, width, height, sampleRate, settings);
				}

				if (settings.extensionEnabled && spectrumExtensionRef.current && !extensionErrorRef.current.spectrum) {
					try {
						spectrumExtensionRef.current(extensionContext);
					} catch (error) {
						extensionErrorRef.current.spectrum = true;
						console.warn("[extension] Spectrum code runtime error", error);
					}
				}

				const effectiveDuration = Math.max(0, duration);
				const effectiveTime = Math.max(0, currentTime);

				if (settings.overlayMode === "logo") {
					drawOverlayLogo(ctx, width, height, settings, bassIntensity, textReact, overlayImageRef.current);
				} else {
					drawOverlayText(ctx, width, height, settings, bassIntensity, textReact);
				}

				if (settings.extensionEnabled && textExtensionRef.current && !extensionErrorRef.current.text) {
					try {
						textExtensionRef.current(extensionContext);
					} catch (error) {
						extensionErrorRef.current.text = true;
						console.warn("[extension] Text code runtime error", error);
					}
				}
				if (settings.drawProgress) drawProgress(ctx, width, height, effectiveDuration, effectiveTime);
			};

			draw(context, displayWidth, displayHeight, screenParticlesRef.current);
			draw(exportContext, 1920, 1080, exportParticlesRef.current);
			frame = requestAnimationFrame(renderFrame);
		};

		frame = requestAnimationFrame(renderFrame);
		return () => cancelAnimationFrame(frame);
	}, [mode, frequencyData, timeData, duration, currentTime, sampleRate, settings, bassIntensity]);

	const handleSeekFromCanvas = (clientX: number) => {
		if (!duration || !canvasRef.current) return;
		const rect = canvasRef.current.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		const offsetSec = Math.max(0, settings.audioOffsetMs / 1000);
		const preferredDuration = settings.audioDurationMs > 0 ? settings.audioDurationMs / 1000 : duration;
		const effectiveDuration = Math.max(0, Math.min(duration - offsetSec, preferredDuration));
		onSeek(offsetSec + ratio * effectiveDuration);
	};

	return (
		<canvas
			ref={canvasRef}
			className='h-full w-full cursor-pointer'
			onClick={(event) => handleSeekFromCanvas(event.clientX)}
		/>
	);
}
