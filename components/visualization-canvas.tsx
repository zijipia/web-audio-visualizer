'use client';

import { useEffect, useRef } from 'react';

export type VisualizationMode = 'bars' | 'waveform' | 'circular';

interface VisualizationCanvasProps {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  mode: VisualizationMode;
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  onExportCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

function drawBars(ctx: CanvasRenderingContext2D, data: Uint8Array, width: number, height: number) {
  const count = Math.max(32, Math.floor(data.length * 0.6));
  const barWidth = width / count;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#fb923c');
  gradient.addColorStop(1, '#f59e0b');

  ctx.fillStyle = 'rgba(10,14,39,0.2)';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = gradient;

  for (let i = 0; i < count; i += 1) {
    const value = data[i] ?? 0;
    const barHeight = (value / 255) * (height * 0.72);
    const x = i * barWidth;
    const y = height - barHeight;
    ctx.fillRect(x + 1, y, Math.max(1, barWidth - 3), barHeight);
  }
}

function drawWaveform(ctx: CanvasRenderingContext2D, data: Uint8Array, width: number, height: number) {
  ctx.fillStyle = 'rgba(10,14,39,0.2)';
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#fb923c');
  gradient.addColorStop(0.5, '#f59e0b');
  gradient.addColorStop(1, '#22d3ee');

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 4;
  ctx.beginPath();

  const sliceWidth = width / data.length;
  for (let i = 0; i < data.length; i += 1) {
    const y = ((data[i] ?? 128) / 255) * height;
    const x = i * sliceWidth;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.stroke();
}

function drawCircular(ctx: CanvasRenderingContext2D, data: Uint8Array, width: number, height: number) {
  ctx.fillStyle = 'rgba(10,14,39,0.2)';
  ctx.fillRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = Math.min(centerX, centerY) * 0.26;
  const maxLength = Math.min(centerX, centerY) * 0.5;

  ctx.save();
  ctx.translate(centerX, centerY);

  for (let i = 0; i < data.length; i += 2) {
    const strength = (data[i] ?? 0) / 255;
    const angle = (i / data.length) * Math.PI * 2;
    const length = baseRadius + strength * maxLength;

    const x1 = Math.cos(angle) * baseRadius;
    const y1 = Math.sin(angle) * baseRadius;
    const x2 = Math.cos(angle) * length;
    const y2 = Math.sin(angle) * length;

    ctx.strokeStyle = `hsla(${30 + strength * 35}, 90%, ${55 + strength * 15}%, 0.92)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawProgress(ctx: CanvasRenderingContext2D, width: number, height: number, duration: number, currentTime: number) {
  if (!duration) return;
  const progress = Math.max(0, Math.min(1, currentTime / duration));

  ctx.fillStyle = 'rgba(15,23,42,0.7)';
  ctx.fillRect(0, height - 8, width, 8);

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#f97316');
  gradient.addColorStop(1, '#06b6d4');
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
}: VisualizationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1920;
    exportCanvas.height = 1080;
    exportCanvasRef.current = exportCanvas;
    onExportCanvasReady?.(exportCanvas);

    return () => onExportCanvasReady?.(null);
  }, [onExportCanvasReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    const exportContext = exportCanvasRef.current?.getContext('2d');
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

      const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.clearRect(0, 0, width, height);

        if (mode === 'bars') {
          drawBars(ctx, frequencyData, width, height);
        } else if (mode === 'waveform') {
          drawWaveform(ctx, timeData, width, height);
        } else {
          drawCircular(ctx, frequencyData, width, height);
        }

        drawProgress(ctx, width, height, duration, currentTime);
      };

      draw(context, displayWidth, displayHeight);
      draw(exportContext, 1920, 1080);
      frame = requestAnimationFrame(renderFrame);
    };

    frame = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(frame);
  }, [mode, frequencyData, timeData, duration, currentTime]);

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
