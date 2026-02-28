'use client';

import { useEffect, useMemo, useRef } from 'react';

export type VisualizationMode = 'bars' | 'waveform' | 'circular';

interface DrawFrameInput {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  mode: VisualizationMode;
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  currentTime: number;
  duration: number;
}

export function drawVisualizationFrame({
  ctx,
  width,
  height,
  mode,
  frequencyData,
  timeData,
  currentTime,
  duration,
}: DrawFrameInput) {
  ctx.clearRect(0, 0, width, height);

  if (mode === 'bars') {
    const barCount = Math.min(frequencyData.length, 220);
    const barWidth = width / barCount;
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, '#f97316');
    gradient.addColorStop(1, '#fbbf24');

    for (let i = 0; i < barCount; i++) {
      const value = frequencyData[i] / 255;
      const h = value * height * 0.85;
      const x = i * barWidth;
      ctx.fillStyle = gradient;
      ctx.fillRect(x, height - h, barWidth * 0.75, h);
    }
  }

  if (mode === 'waveform') {
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const slice = width / timeData.length;
    for (let i = 0; i < timeData.length; i++) {
      const y = (timeData[i] / 255) * height;
      const x = i * slice;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
  }

  if (mode === 'circular') {
    const cx = width / 2;
    const cy = height / 2;
    const base = Math.min(width, height) * 0.16;
    const max = Math.min(width, height) * 0.42;
    const bars = Math.min(frequencyData.length, 240);

    for (let i = 0; i < bars; i++) {
      const amp = frequencyData[i] / 255;
      const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
      const inner = base;
      const outer = inner + amp * (max - base);

      ctx.strokeStyle = `hsl(${35 + i / 6}, 95%, ${50 + amp * 20}%)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.stroke();
    }
  }

  const progress = duration > 0 ? currentTime / duration : 0;
  ctx.fillStyle = 'rgba(15,23,42,0.65)';
  ctx.fillRect(0, height - 8, width, 8);
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(0, height - 8, width * progress, 8);
}

interface VisualizationCanvasProps {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  mode: VisualizationMode;
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  onExportCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
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
  const exportCanvas = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    return canvas;
  }, []);

  useEffect(() => {
    onExportCanvasReady?.(exportCanvas);
    return () => onExportCanvasReady?.(null);
  }, [exportCanvas, onExportCanvasReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      drawVisualizationFrame({
        ctx,
        width,
        height,
        mode,
        frequencyData,
        timeData,
        currentTime,
        duration,
      });

      if (exportCanvas) {
        const exportCtx = exportCanvas.getContext('2d');
        if (exportCtx) {
          drawVisualizationFrame({
            ctx: exportCtx,
            width: 1920,
            height: 1080,
            mode,
            frequencyData,
            timeData,
            currentTime,
            duration,
          });
        }
      }

      requestAnimationFrame(draw);
    };

    const raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [currentTime, duration, exportCanvas, frequencyData, mode, timeData]);

  return (
    <canvas
      ref={canvasRef}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = (event.clientX - rect.left) / rect.width;
        onSeek(ratio * duration);
      }}
      className="h-full w-full cursor-crosshair"
    />
  );
}
