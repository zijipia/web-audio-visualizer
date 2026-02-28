"use client";

import { useEffect, useRef } from "react";

export type VisualizationMode = "bars" | "waveform" | "circular";
export type SpectrumColorScheme = "sunset" | "neon" | "fire";

export interface SpectrumSettings {
  barCount: number;
  sensitivity: number;
  lineWidth: number;
  radialBoost: number;
  startFrequency: number;
  endFrequency: number;
  frequencyBands: number;
  maximumHeight: number;
  audioDurationMs: number;
  audioOffsetMs: number;
  thickness: number;
  softness: number;
  rotationSpeed: number;
  glow: number;
  blockSize: number;
  colorScheme: SpectrumColorScheme;
  mirror: boolean;
}

interface VisualizationCanvasProps {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  mode: VisualizationMode;
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  onExportCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
  settings: SpectrumSettings;
  sampleRate: number;
}

function createGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scheme: SpectrumColorScheme,
) {
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

function drawBars(
  ctx: CanvasRenderingContext2D,
  data: Float32Array,
  width: number,
  height: number,
  settings: SpectrumSettings,
) {
  const count = Math.max(16, Math.min(settings.frequencyBands, data.length));
  const barWidth = width / count;
  const gradient = createGradient(ctx, 0, height, settings.colorScheme);
  const blockHeight = Math.max(4, settings.blockSize);

  ctx.fillStyle = "rgba(10,14,39,0.16)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = gradient;
  ctx.shadowColor = "rgba(34,211,238,0.8)";
  ctx.shadowBlur = settings.glow;

  const startX = settings.mirror ? width / 2 : 0;

  for (let i = 0; i < count; i += 1) {
    const value = Math.min(1, data[i] ?? 0);
    const barHeight = value * (height * settings.maximumHeight);
    const blocks = Math.max(1, Math.floor(barHeight / blockHeight));

    const drawStack = (x: number) => {
      for (let block = 0; block < blocks; block += 1) {
        const y = height - (block + 1) * blockHeight;
        const decay = 1 - (block / Math.max(1, blocks)) * settings.softness;
        const alpha = Math.max(0.2, decay);
        ctx.globalAlpha = alpha;
        ctx.fillRect(
          x + 1,
          y,
          Math.max(1, barWidth - settings.thickness),
          Math.max(2, blockHeight - 1),
        );
      }
      ctx.globalAlpha = 1;
    };

    if (settings.mirror) {
      const xR = startX + i * (barWidth / 2);
      const xL = startX - (i + 1) * (barWidth / 2);
      drawStack(xR + 0.5);
      drawStack(xL + 0.5);
    } else {
      const x = i * barWidth;
      drawStack(x);
    }
  }

  ctx.shadowBlur = 0;
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  data: Uint8Array,
  width: number,
  height: number,
  settings: SpectrumSettings,
) {
  ctx.fillStyle = "rgba(10,14,39,0.16)";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = createGradient(ctx, width, 0, settings.colorScheme);
  ctx.lineWidth = Math.max(1, settings.thickness);
  ctx.shadowColor = "rgba(244,114,182,0.75)";
  ctx.shadowBlur = settings.glow;
  ctx.beginPath();

  const sliceWidth = width / data.length;
  const center = height / 2;
  for (let i = 0; i < data.length; i += 1) {
    const normalized = ((data[i] ?? 128) - 128) / 128;
    const y =
      center + normalized * center * Math.min(1.3, settings.sensitivity);
    const x = i * sliceWidth;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawCircular(
  ctx: CanvasRenderingContext2D,
  data: Float32Array,
  width: number,
  height: number,
  settings: SpectrumSettings,
  elapsedSeconds: number,
) {
  ctx.fillStyle = "rgba(10,14,39,0.16)";
  ctx.fillRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = Math.min(centerX, centerY) * 0.24;
  const maxLength =
    Math.min(centerX, centerY) * (0.5 + settings.radialBoost * 0.35);
  const rotation = elapsedSeconds * settings.rotationSpeed;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.shadowColor = "rgba(56,189,248,0.8)";
  ctx.shadowBlur = settings.glow;

  for (let i = 0; i < data.length; i += 1) {
    const strength = Math.min(1, data[i] ?? 0);
    const angle = (i / data.length) * Math.PI * 2;
    const length = baseRadius + strength * maxLength;

    const x1 = Math.cos(angle) * baseRadius;
    const y1 = Math.sin(angle) * baseRadius;
    const x2 = Math.cos(angle) * length;
    const y2 = Math.sin(angle) * length;

    const hueOffset =
      settings.colorScheme === "neon"
        ? 180
        : settings.colorScheme === "fire"
          ? 10
          : 30;
    ctx.strokeStyle = `hsla(${hueOffset + strength * 70}, 92%, ${54 + strength * 18}%, 0.94)`;
    ctx.lineWidth = Math.max(1.5, settings.thickness * 0.7);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    if (settings.mirror) {
      ctx.beginPath();
      ctx.moveTo(-x1, y1);
      ctx.lineTo(-x2, y2);
      ctx.stroke();
    }
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

function buildBandLevels(
  data: Uint8Array,
  sampleRate: number,
  settings: SpectrumSettings,
  previous: Float32Array,
) {
  const nyquist = sampleRate / 2;
  const startHz = Math.max(0, Math.min(settings.startFrequency, nyquist));
  const endHz = Math.max(startHz + 10, Math.min(settings.endFrequency, nyquist));
  const startBin = Math.floor((startHz / nyquist) * data.length);
  const endBin = Math.max(startBin + 1, Math.floor((endHz / nyquist) * data.length));
  const range = Math.max(1, endBin - startBin);
  const bands = Math.max(8, settings.frequencyBands);
  const next = new Float32Array(bands);

  const attack = Math.min(1, 16 / Math.max(16, settings.audioOffsetMs));
  const release = Math.min(1, 16 / Math.max(16, settings.audioDurationMs));

  for (let i = 0; i < bands; i += 1) {
    const from = startBin + Math.floor((i / bands) * range);
    const to = startBin + Math.floor(((i + 1) / bands) * range);
    let sum = 0;
    let count = 0;

    for (let bin = from; bin < Math.max(from + 1, to); bin += 1) {
      sum += data[bin] ?? 0;
      count += 1;
    }

    const raw = Math.min(1, ((sum / Math.max(1, count)) / 255) * settings.sensitivity);
    const prev = previous[i] ?? 0;
    const smoothing = raw > prev ? attack : release * (1 - (i / bands) * 0.5);
    next[i] = prev + (raw - prev) * (1 - settings.softness * 0.6) * smoothing;
  }

  return next;
}

function drawProgress(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  duration: number,
  currentTime: number,
) {
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

export function VisualizationCanvas({
  frequencyData,
  timeData,
  mode,
  duration,
  currentTime,
  onSeek,
  onExportCanvasReady,
  settings,
  sampleRate,
}: VisualizationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const smoothedBandsRef = useRef<Float32Array>(new Float32Array(settings.frequencyBands));

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

      if (
        canvas.width !== Math.floor(displayWidth * dpr) ||
        canvas.height !== Math.floor(displayHeight * dpr)
      ) {
        canvas.width = Math.floor(displayWidth * dpr);
        canvas.height = Math.floor(displayHeight * dpr);
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const draw = (
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
      ) => {
        ctx.clearRect(0, 0, width, height);

        if (smoothedBandsRef.current.length !== settings.frequencyBands) {
          smoothedBandsRef.current = new Float32Array(settings.frequencyBands);
        }

        const levels = buildBandLevels(
          frequencyData,
          sampleRate,
          settings,
          smoothedBandsRef.current,
        );
        smoothedBandsRef.current = levels;

        if (mode === "bars") {
          drawBars(ctx, levels, width, height, settings);
        } else if (mode === "waveform") {
          drawWaveform(ctx, timeData, width, height, settings);
        } else {
          drawCircular(ctx, levels, width, height, settings, performance.now() / 1000);
        }

        drawProgress(ctx, width, height, duration, currentTime);
      };

      draw(context, displayWidth, displayHeight);
      draw(exportContext, 1920, 1080);
      frame = requestAnimationFrame(renderFrame);
    };

    frame = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(frame);
  }, [mode, frequencyData, timeData, duration, currentTime, settings, sampleRate]);

  const handleSeekFromCanvas = (clientX: number) => {
    if (!duration || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full cursor-pointer"
      onClick={(event) => handleSeekFromCanvas(event.clientX)}
    />
  );
}
