"use client";

import { useEffect, useRef } from "react";

export type VisualizationMode = "bars" | "waveform" | "circular";
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
	overlayText: string;
	overlayTextSize: number;
	overlayTextY: number;
	overlayTextOpacity: number;
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

function drawBackground(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	bassIntensity: number,
	bgImage: HTMLImageElement | null,
	smoothBassRef: { current: number },
	particles: Particle[],
	deltaMs: number,
) {
	smoothBassRef.current += (bassIntensity - smoothBassRef.current) * 0.12;
	const smoothBass = smoothBassRef.current;

	ctx.save();
	ctx.fillStyle = "#050812";
	ctx.fillRect(0, 0, width, height);

	if (bgImage) {
		const scale = 1.08 + smoothBass * 0.1;
		const drawWidth = width * scale;
		const drawHeight = height * scale;
		const x = (width - drawWidth) / 2;
		const y = (height - drawHeight) / 2;

		ctx.globalAlpha = 0.56 + smoothBass * 0.18;
		ctx.filter = `brightness(${0.5 + smoothBass * 0.35}) saturate(${1.05 + smoothBass * 0.35})`;
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
	pulse.addColorStop(0, `rgba(251, 146, 60, ${0.14 + smoothBass * 0.35})`);
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

	const count = Math.max(
		16,
		Math.min(
			settings.frequencyBands,
			data.length,
		),
	);

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
	const step = Math.max(1, Math.floor(rangeLength / Math.max(36, settings.frequencyBands)));

	ctx.fillStyle = `rgba(10,14,39,${0.12 + (1 - settings.softness) * 0.24})`;
	ctx.fillRect(0, 0, width, height);

	const centerX = width / 2;
	const centerY = height / 2;
	const baseRadius = Math.min(centerX, centerY) * 0.24;
	const maxLength = Math.min(centerX, centerY) * (0.38 + settings.maxHeight / 1000);
	const spin = (performance.now() / 1000) * settings.rotationSpeed;

	ctx.save();
	ctx.translate(centerX, centerY);
	ctx.rotate(spin);
	ctx.shadowColor = settings.glow ? "rgba(255,130,80,0.85)" : "transparent";
	ctx.shadowBlur = settings.glow;

	const sweep = settings.mirror ? Math.PI : Math.PI * 2;
	for (let i = 0; i < rangeLength; i += step) {
		const sampleIndex = startIndex + i;
		const strength = Math.min(1, ((data[sampleIndex] ?? 0) / 255) * settings.sensitivity);
		const angle = (i / rangeLength) * sweep;
		const length = baseRadius + strength * maxLength;

		const x1 = Math.cos(angle) * baseRadius;
		const y1 = Math.sin(angle) * baseRadius;
		const x2 = Math.cos(angle) * length;
		const y2 = Math.sin(angle) * length;

		const hueOffset =
			settings.colorScheme === "neon" ? 180
			: settings.colorScheme === "fire" ? 10
			: 30;
		ctx.strokeStyle = `hsla(${hueOffset + strength * 70}, 92%, ${54 + strength * 18}%, 0.94)`;
		ctx.lineWidth = Math.max(1, settings.thickness * 0.7);
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();

		if (settings.mirror) {
			ctx.beginPath();
			ctx.moveTo(x1, -y1);
			ctx.lineTo(x2, -y2);
			ctx.stroke();
		}
	}

	ctx.shadowBlur = 0;
	ctx.restore();
}


function drawOverlayText(ctx: CanvasRenderingContext2D, width: number, height: number, settings: SpectrumSettings, bassIntensity: number) {
	const text = settings.overlayText.trim();
	if (!text) return;

	const size = Math.max(16, settings.overlayTextSize);
	const y = Math.max(40, Math.min(height - 24, settings.overlayTextY));
	const alpha = Math.max(0, Math.min(1, settings.overlayTextOpacity));
	const pulse = 0.82 + bassIntensity * 0.3;

	ctx.save();
	ctx.font = `700 ${size}px Inter, system-ui, sans-serif`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.shadowColor = `rgba(34, 211, 238, ${0.35 + bassIntensity * 0.4})`;
	ctx.shadowBlur = 14 + bassIntensity * 24;
	ctx.fillStyle = `rgba(241, 245, 249, ${alpha * pulse})`;
	ctx.fillText(text, width / 2, y);
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

export function VisualizationCanvas({ frequencyData, timeData, sampleRate, mode, duration, currentTime, onSeek, onExportCanvasReady, settings, bassIntensity, backgroundImage }: VisualizationCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const barDisplayStateRef = useRef<Float32Array>(new Float32Array(512));
	const lastFrameTimeRef = useRef<number>(performance.now());
	const smoothBassRef = useRef<number>(0);
	const imageRef = useRef<HTMLImageElement | null>(null);
	const screenParticlesRef = useRef<Particle[]>([]);
	const exportParticlesRef = useRef<Particle[]>([]);

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
				drawBackground(ctx, width, height, bassIntensity, imageRef.current, smoothBassRef, particles, deltaMs);

				if (mode === "bars") {
					drawBars(ctx, frequencyData, width, height, sampleRate, settings, barDisplayStateRef.current, deltaMs);
				} else if (mode === "waveform") {
					drawWaveform(ctx, timeData, width, height, settings);
				} else {
					drawCircular(ctx, frequencyData, width, height, sampleRate, settings);
				}

				const offsetSec = Math.max(0, settings.audioOffsetMs / 1000);
				const preferredDuration = settings.audioDurationMs > 0 ? settings.audioDurationMs / 1000 : duration;
				const effectiveDuration = Math.max(0, Math.min(duration - offsetSec, preferredDuration));
				const effectiveTime = Math.max(0, currentTime - offsetSec);

				drawOverlayText(ctx, width, height, settings, bassIntensity);
				drawProgress(ctx, width, height, effectiveDuration, effectiveTime);
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
