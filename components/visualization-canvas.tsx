"use client";

import { useEffect, useRef } from "react";

export type VisualizationMode = "bars" | "waveform" | "circular";
export type SpectrumColorScheme = "sunset" | "neon" | "fire";

export interface SpectrumSettings {
  barCount: number;
  sensitivity: number;
  lineWidth: number;
  radialBoost: number;
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
  data: Uint8Array,
  width: number,
  height: number,
  settings: SpectrumSettings,
) {
  const count = Math.max(16, Math.min(settings.barCount, data.length));
  const barWidth = width / count;
  const gradient = createGradient(ctx, 0, height, settings.colorScheme);

  ctx.fillStyle = "rgba(10,14,39,0.16)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = gradient;

  const startX = settings.mirror ? width / 2 : 0;

  for (let i = 0; i < count; i += 1) {
    const sourceIndex = Math.floor((i / count) * data.length);

    const value = Math.min(
      1,
      ((data[sourceIndex] ?? 0) / 255) * settings.sensitivity,
    );

    const barHeight = value * (height * 0.78);
    const y = height - barHeight;

    if (settings.mirror) {
      const xR = startX + i * (barWidth / 2);
      const xL = startX - (i + 1) * (barWidth / 2);
      ctx.fillRect(xR + 0.5, y, Math.max(1, barWidth / 2 - 1.5), barHeight);
      ctx.fillRect(xL + 0.5, y, Math.max(1, barWidth / 2 - 1.5), barHeight);
    } else {
      const x = i * barWidth;
      ctx.fillRect(x + 1, y, Math.max(1, barWidth - 2.5), barHeight);
    }
  }
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
  ctx.lineWidth = settings.lineWidth;
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
}

function drawCircular(
  ctx: CanvasRenderingContext2D,
  data: Uint8Array,
  width: number,
  height: number,
  settings: SpectrumSettings,
) {
  ctx.fillStyle = "rgba(10,14,39,0.16)";
  ctx.fillRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = Math.min(centerX, centerY) * 0.24;
  const maxLength =
    Math.min(centerX, centerY) * (0.5 + settings.radialBoost * 0.35);
  const step = Math.max(
    1,
    Math.floor(data.length / Math.max(64, settings.barCount)),
  );

  ctx.save();
  ctx.translate(centerX, centerY);

  for (let i = 0; i < data.length; i += step) {
    const strength = Math.min(1, ((data[i] ?? 0) / 255) * settings.sensitivity);
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
    ctx.lineWidth = Math.max(1.5, settings.lineWidth * 0.7);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.restore();
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
}: VisualizationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

        if (mode === "bars") {
          drawBars(ctx, frequencyData, width, height, settings);
        } else if (mode === "waveform") {
          drawWaveform(ctx, timeData, width, height, settings);
        } else {
          drawCircular(ctx, frequencyData, width, height, settings);
        }

        drawProgress(ctx, width, height, duration, currentTime);
      };

      draw(context, displayWidth, displayHeight);
      draw(exportContext, 1920, 1080);
      frame = requestAnimationFrame(renderFrame);
    };

    frame = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(frame);
  }, [mode, frequencyData, timeData, duration, currentTime, settings]);

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
