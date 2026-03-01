"use client";

import { useEffect, useRef } from "react";

export type VisualizationMode = "bars" | "waveform" | "circular" | "liquid" | "dual-wave";
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

function resolveFrequencyRange(data: Uint8Array, sampleRate: number, settings: SpectrumSettings) {
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

function resolveBandEnergy(data: Uint8Array, sampleRate: number, minHz: number, maxHz: number, sensitivity = 1) {
	if (!data.length) return 0;
	const nyquist = sampleRate / 2;
	const safeMin = Math.max(0, Math.min(minHz, nyquist));
	const safeMax = Math.max(safeMin + 1, Math.min(maxHz, nyquist));
	const start = Math.floor((safeMin / nyquist) * data.length);
	const end = Math.max(start + 1, Math.floor((safeMax / nyquist) * data.length));

	let sum = 0;
	for (let i = start; i < end; i += 1) sum += data[i] ?? 0;
	const average = sum / Math.max(1, end - start);
	return Math.max(0, Math.min(1, (average / 255) * sensitivity));
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

function drawBars(ctx: CanvasRenderingContext2D, data: Uint8Array, width: number, height: number, sampleRate: number, settings: SpectrumSettings, displayState: Float32Array, deltaMs: number) {
	const { startIndex, endIndex } = resolveFrequencyRange(data, sampleRate, settings);
	const usableLength = Math.max(1, endIndex - startIndex);

	const count = Math.max(16, Math.min(settings.frequencyBands, data.length));

	const barWidth = width / count;
	const gradient = createGradient(ctx, 0, height, settings.colorScheme);
	const maxDrawableHeight = height * (settings.maxHeight / 1000);
	const decayPerFrame = (settings.fallSpeed * deltaMs) / 16.67;

	ctx.fillStyle = `rgba(10,14,39,${0.12 + (1 - settings.softness) * 0.24})`;
	ctx.fillRect(0, 0, width, height);
	ctx.fillStyle = gradient;
	ctx.shadowColor = settings.glow ? "rgba(255,255,255,0.7)" : "transparent";
	ctx.shadowBlur = settings.glow;

	const startX = settings.mirror ? width / 2 : 0;
	const halfWidth = Math.max(1, barWidth / (settings.mirror ? 2 : 1) - 1.5);

	for (let i = 0; i < count; i += 1) {
		const sourceIndex = startIndex + Math.floor((i / count) * Math.max(1, usableLength - 1));

		const value = Math.min(1, ((data[sourceIndex] ?? 0) / 255) * settings.sensitivity);

		const targetHeight = value * maxDrawableHeight;
		const easedHeight = Math.max(targetHeight, (displayState[i] ?? 0) - decayPerFrame);
		displayState[i] = easedHeight;
		const barHeight = easedHeight;
		const y = height - barHeight;

		const drawSegmentedBar = (x: number) => {
			if (!settings.segmented) {
				ctx.fillRect(x, y, halfWidth - settings.thickness, barHeight);
				return;
			}

			const segmentHeight = Math.max(4, settings.thickness * 2.2);
			const segmentGap = Math.max(1, settings.thickness * 0.5);
			const segments = Math.floor(barHeight / (segmentHeight + segmentGap));

			for (let segmentIndex = 0; segmentIndex <= segments; segmentIndex += 1) {
				const segmentY = height - (segmentIndex + 1) * segmentHeight - segmentIndex * segmentGap;
				const decay = 1 - (segmentIndex / Math.max(1, segments)) * settings.softness;
				const alpha = Math.max(0.2, decay);
				ctx.globalAlpha = alpha;

				ctx.fillRect(x, segmentY, halfWidth - settings.thickness, segmentHeight);
			}
			ctx.globalAlpha = 1;
		};

		if (settings.mirror) {
			const xR = startX + i * (barWidth / 2);
			const xL = startX - (i + 1) * (barWidth / 2);
			drawSegmentedBar(xR + 0.5);
			drawSegmentedBar(xL + 0.5);
		} else {
			const x = i * barWidth;
			drawSegmentedBar(x + 1);
		}
	}
	ctx.shadowBlur = 0;
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

function drawCircular(ctx: CanvasRenderingContext2D, data: Uint8Array, width: number, height: number, sampleRate: number, settings: SpectrumSettings) {
	const { startIndex, endIndex } = resolveFrequencyRange(data, sampleRate, settings);
	const rangeLength = Math.max(1, endIndex - startIndex);
	const bars = Math.max(64, settings.frequencyBands * 2);
	const step = Math.max(1, Math.floor(rangeLength / bars));

	ctx.fillStyle = `rgba(10,14,39,${0.1 + (1 - settings.softness) * 0.22})`;
	ctx.fillRect(0, 0, width, height);

	const cx = width / 2;
	const cy = height / 2;

	const baseRadius = Math.min(cx, cy) * 0.24;
	const maxAmp = Math.min(cx, cy) * (0.32 + settings.maxHeight / 1200);

	const spin = (performance.now() / 1000) * settings.rotationSpeed;

	ctx.save();
	ctx.translate(cx, cy);
	ctx.rotate(spin);

	ctx.lineWidth = Math.max(1.5, settings.thickness * 0.7);
	ctx.lineCap = "round";

	if (settings.glow) {
		ctx.shadowBlur = settings.glow * 1.5;
	}

	// const sweep = settings.mirror ? Math.PI : Math.PI * 2;
	const sweep = Math.PI * 2;

	function drawBar(angle: number, energy: number) {
		const amp = energy * maxAmp;
		const r1 = baseRadius;
		const r2 = baseRadius + amp;

		const x1 = Math.cos(angle) * r1;
		const y1 = Math.sin(angle) * r1;
		const x2 = Math.cos(angle) * r2;
		const y2 = Math.sin(angle) * r2;

		const hue = (angle / (Math.PI * 2)) * 360 + 180;

		ctx.strokeStyle = `hsla(${hue},95%,${55 + energy * 20}%,${0.45 + energy * 0.55})`;
		ctx.shadowColor = settings.glow ? `hsla(${hue},100%,65%,0.85)` : "transparent";

		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
	}
	if (settings.mirror) {
		const half = Math.floor(rangeLength / 2);

		for (let i = 0; i < half; i += step) {
			const idx1 = startIndex + i;
			const idx2 = startIndex + (half - i);

			let e1 = (data[idx1] ?? 0) / 255;
			let e2 = (data[idx2] ?? 0) / 255;

			e1 = Math.pow(e1 * settings.sensitivity, 0.65);
			e2 = Math.pow(e2 * settings.sensitivity, 0.65);

			const a1 = (i / half) * Math.PI * 2 - Math.PI / 2;
			const a2 = ((i + half) / half) * Math.PI * 2 - Math.PI / 2;

			drawBar(a1, e1);
			drawBar(a2, e2);
		}
	} else {
		for (let i = 0; i < rangeLength; i += step) {
			const index = startIndex + i;

			let energy = (data[index] ?? 0) / 255;

			// Anti-spike smoothing
			energy = Math.pow(energy * settings.sensitivity, 0.65);
			energy = Math.min(1, energy);

			const angle = (i / rangeLength) * sweep - Math.PI / 2;
			const amp = energy * maxAmp;

			const r1 = baseRadius;
			const r2 = baseRadius + amp;

			const x1 = Math.cos(angle) * r1;
			const y1 = Math.sin(angle) * r1;
			const x2 = Math.cos(angle) * r2;
			const y2 = Math.sin(angle) * r2;

			let hue;
			if (settings.colorScheme === "neon") hue = (i / rangeLength) * 360 + 180;
			else if (settings.colorScheme === "fire") hue = 10 + energy * 60;
			else hue = (i / rangeLength) * 360;

			ctx.strokeStyle = `hsla(${hue}, 95%, ${55 + energy * 20}%, ${0.5 + energy * 0.5})`;
			ctx.shadowColor = settings.glow ? `hsla(${hue},100%,65%,0.85)` : "transparent";

			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();
		}
	}

	ctx.restore();
}

function sampleSpectrumPoints(data: Uint8Array, sampleRate: number, settings: SpectrumSettings, width: number, pointCount: number) {
	const { startIndex, endIndex } = resolveFrequencyRange(data, sampleRate, settings);
	const rangeLength = Math.max(1, endIndex - startIndex);
	const points: { x: number; y: number; energy: number }[] = [];

	for (let i = 0; i < pointCount; i += 1) {
		const t = i / Math.max(1, pointCount - 1);
		const curvedT = Math.pow(t, 1.6);
		const index = startIndex + Math.floor(curvedT * (rangeLength - 1));
		const rawEnergy = ((data[index] ?? 0) / 255) * settings.sensitivity;
		const energy = Math.min(1, Math.pow(rawEnergy, 0.75));

		points.push({
			x: t * width,
			y: 0,
			energy,
		});
	}

	return points;
}

function drawSmoothPath(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]) {
	if (!points.length) return;

	ctx.beginPath();
	ctx.moveTo(points[0].x, points[0].y);

	for (let i = 1; i < points.length - 1; i += 1) {
		const current = points[i];
		const next = points[i + 1];
		const controlX = (current.x + next.x) / 2;
		const controlY = (current.y + next.y) / 2;
		ctx.quadraticCurveTo(current.x, current.y, controlX, controlY);
	}

	const last = points[points.length - 1];
	ctx.lineTo(last.x, last.y);
}

function drawLiquidReflection(ctx: CanvasRenderingContext2D, data: Uint8Array, width: number, height: number, sampleRate: number, settings: SpectrumSettings) {
	ctx.fillStyle = "rgba(8, 15, 30, 0.28)";
	ctx.fillRect(0, 0, width, height);

	const horizon = height * 0.62;
	const points = sampleSpectrumPoints(data, sampleRate, settings, width, 76);
	const amp = height * (0.18 + settings.maxHeight / 2200);

	const wavePoints = points.map((point, index) => {
		const ripple = Math.sin(index * 0.25 + performance.now() * 0.002) * amp * 0.05;
		return {
			x: point.x,
			y: horizon - point.energy * amp - ripple,
		};
	});

	const fillGradient = ctx.createLinearGradient(0, horizon - amp * 1.2, 0, horizon + amp * 0.25);
	fillGradient.addColorStop(0, "rgba(248, 250, 252, 0.95)");
	fillGradient.addColorStop(1, "rgba(226, 232, 240, 0.66)");

	ctx.save();
	drawSmoothPath(ctx, wavePoints);
	ctx.lineTo(width, horizon);
	ctx.lineTo(0, horizon);
	ctx.closePath();
	ctx.fillStyle = fillGradient;
	ctx.shadowColor = "rgba(255,255,255,0.45)";
	ctx.shadowBlur = 12 + settings.glow;
	ctx.fill();
	ctx.restore();

	ctx.save();
	drawSmoothPath(ctx, wavePoints);
	ctx.strokeStyle = "rgba(241, 245, 249, 0.95)";
	ctx.lineWidth = Math.max(1.6, settings.thickness * 0.8);
	ctx.stroke();
	ctx.restore();

	ctx.save();
	ctx.beginPath();
	ctx.rect(0, horizon, width, height - horizon);
	ctx.clip();
	ctx.translate(0, horizon * 2);
	ctx.scale(1, -1);
	drawSmoothPath(ctx, wavePoints);
	ctx.lineTo(width, horizon);
	ctx.lineTo(0, horizon);
	ctx.closePath();

	const reflectionGradient = ctx.createLinearGradient(0, horizon, 0, height);
	reflectionGradient.addColorStop(0, "rgba(248,250,252,0.30)");
	reflectionGradient.addColorStop(1, "rgba(248,250,252,0)");
	ctx.fillStyle = reflectionGradient;
	ctx.filter = "blur(8px)";
	ctx.fill();
	ctx.restore();

	ctx.fillStyle = "rgba(248, 250, 252, 0.95)";
	ctx.fillRect(0, horizon - 1, width, 2);
}

function drawDualWave(ctx: CanvasRenderingContext2D, data: Uint8Array, width: number, height: number, sampleRate: number, settings: SpectrumSettings) {
	ctx.fillStyle = "rgba(8, 15, 30, 0.2)";
	ctx.fillRect(0, 0, width, height);

	const baseLine = height * 0.78;
	const points = sampleSpectrumPoints(data, sampleRate, settings, width, 64);
	const leftBias = 0.9;

	const frontWave = points.map((point, index) => {
		const waveBias = 1 - (index / Math.max(1, points.length - 1)) * leftBias;
		return {
			x: point.x,
			y: baseLine - point.energy * height * (0.62 + waveBias * 0.2),
		};
	});

	const backWave = points.map((point, index) => {
		const drift = Math.sin(index * 0.18 + performance.now() * 0.0015) * 10;
		return {
			x: point.x,
			y: baseLine - point.energy * height * 0.42 - drift,
		};
	});

	const cyan = ctx.createLinearGradient(0, 0, width, 0);
	cyan.addColorStop(0, "rgba(34, 211, 238, 0.9)");
	cyan.addColorStop(1, "rgba(34, 211, 238, 0.65)");

	ctx.save();
	drawSmoothPath(ctx, backWave);
	ctx.lineTo(width, baseLine);
	ctx.lineTo(0, baseLine);
	ctx.closePath();
	ctx.fillStyle = cyan;
	ctx.globalAlpha = 0.88;
	ctx.fill();
	ctx.restore();

	ctx.save();
	drawSmoothPath(ctx, frontWave);
	ctx.lineTo(width, baseLine);
	ctx.lineTo(0, baseLine);
	ctx.closePath();
	ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
	ctx.fill();
	ctx.restore();

	ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
	ctx.fillRect(0, baseLine - 1, width, 2);
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

			const draw = (ctx: CanvasRenderingContext2D, width: number, height: number, particles: Particle[]) => {
				ctx.clearRect(0, 0, width, height);
				const textReact = resolveBandEnergy(frequencyData, sampleRate, settings.overlayTextReactMinHz, settings.overlayTextReactMaxHz, settings.sensitivity);
				const backgroundReact = resolveBandEnergy(frequencyData, sampleRate, settings.backgroundReactMinHz, settings.backgroundReactMaxHz, settings.sensitivity);

				drawBackground(ctx, width, height, bassIntensity, backgroundReact, imageRef.current, settings, smoothBassRef, particles, deltaMs);

				const extensionContext: ExtensionContext = {
					ctx,
					width,
					height,
					settings,
					frequencyData,
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
					drawBars(ctx, frequencyData, width, height, sampleRate, settings, barDisplayStateRef.current, deltaMs);
				} else if (mode === "waveform") {
					drawWaveform(ctx, timeData, width, height, settings);
				} else if (mode === "liquid") {
					drawLiquidReflection(ctx, frequencyData, width, height, sampleRate, settings);
				} else if (mode === "dual-wave") {
					drawDualWave(ctx, frequencyData, width, height, sampleRate, settings);
				} else {
					drawCircular(ctx, frequencyData, width, height, sampleRate, settings);
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
