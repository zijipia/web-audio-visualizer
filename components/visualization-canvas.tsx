'use client';

import { useEffect, useRef } from 'react';

export type VisualizationMode = 'bars' | 'waveform' | 'circular';

export interface SpectrumOptions {
  density: number;
  sensitivity: number;
  smoothing: number;
  lineWidth: number;
  palette: 'sunset' | 'neon' | 'ocean';
  mirror: boolean;
}

export const DEFAULT_SPECTRUM_OPTIONS: SpectrumOptions = {
  density: 110,
  sensitivity: 1.15,
  smoothing: 0.72,
  lineWidth: 3,
  palette: 'sunset',
  mirror: false,
};

interface VisualizationCanvasProps {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  mode: VisualizationMode;
  duration: number;
  currentTime: number;
  options: SpectrumOptions;
  onSeek: (time: number) => void;
  onExportCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

function paletteColors(palette: SpectrumOptions['palette']) {
  if (palette === 'neon') return ['#22d3ee', '#a78bfa', '#f472b6'];
  if (palette === 'ocean') return ['#0ea5e9', '#06b6d4', '#2dd4bf'];
  return ['#fb923c', '#f59e0b', '#f97316'];
}

function drawBars(ctx: CanvasRenderingContext2D, data: Float32Array, width: number, height: number, options: SpectrumOptions) {
  const count = Math.max(24, Math.min(options.density, data.length));
  const barWidth = width / count;
  const [c1, c2, c3] = paletteColors(options.palette);
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, c1);
  gradient.addColorStop(0.55, c2);
  gradient.addColorStop(1, c3);

  ctx.fillStyle = 'rgba(10,14,39,0.22)';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = gradient;

  const startX = options.mirror ? width / 2 : 0;

  for (let i = 0; i < count; i += 1) {
    const value = data[i] ?? 0;
    const barHeight = Math.min(height * 0.86, value * options.sensitivity * 0.9 * height);
    const y = height - barHeight;

    if (options.mirror) {
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

function drawWaveform(ctx: CanvasRenderingContext2D, data: Float32Array, width: number, height: number, options: SpectrumOptions) {
  ctx.fillStyle = 'rgba(10,14,39,0.22)';
  ctx.fillRect(0, 0, width, height);

  const [c1, c2, c3] = paletteColors(options.palette);
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, c1);
  gradient.addColorStop(0.5, c2);
  gradient.addColorStop(1, c3);

  ctx.strokeStyle = gradient;
  ctx.lineWidth = options.lineWidth;
  ctx.beginPath();

  const sliceWidth = width / data.length;
  for (let i = 0; i < data.length; i += 1) {
    const y = data[i] * height;
    const x = i * sliceWidth;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.stroke();
}

function drawCircular(ctx: CanvasRenderingContext2D, data: Float32Array, width: number, height: number, options: SpectrumOptions) {
  ctx.fillStyle = 'rgba(10,14,39,0.22)';
  ctx.fillRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = Math.min(centerX, centerY) * 0.23;
  const maxLength = Math.min(centerX, centerY) * 0.54;
  const [c1, c2, c3] = paletteColors(options.palette);

  ctx.save();
  ctx.translate(centerX, centerY);

  for (let i = 0; i < data.length; i += 2) {
    const strength = Math.min(1, data[i] * options.sensitivity);
    const angle = (i / data.length) * Math.PI * 2;
    const length = baseRadius + strength * maxLength;

    const x1 = Math.cos(angle) * baseRadius;
    const y1 = Math.sin(angle) * baseRadius;
    const x2 = Math.cos(angle) * length;
    const y2 = Math.sin(angle) * length;

    const color = i % 6 === 0 ? c1 : i % 4 === 0 ? c2 : c3;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5 + strength * 2;
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

  ctx.fillStyle = 'rgba(15,23,42,0.68)';
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
  options,
  onSeek,
  onExportCanvasReady,
}: VisualizationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const smoothFrequencyRef = useRef<Float32Array>(new Float32Array(frequencyData.length || 1024));
  const smoothTimeRef = useRef<Float32Array>(new Float32Array(timeData.length || 1024));

  useEffect(() => {
    smoothFrequencyRef.current = new Float32Array(frequencyData.length || 1024);
    smoothTimeRef.current = new Float32Array(timeData.length || 1024);
  }, [frequencyData.length, timeData.length]);

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

      const smoothFactor = Math.max(0.05, Math.min(0.98, options.smoothing));
      for (let i = 0; i < frequencyData.length; i += 1) {
        const normalized = (frequencyData[i] ?? 0) / 255;
        smoothFrequencyRef.current[i] = smoothFrequencyRef.current[i] * smoothFactor + normalized * (1 - smoothFactor);
      }
      for (let i = 0; i < timeData.length; i += 1) {
        const normalized = (timeData[i] ?? 128) / 255;
        smoothTimeRef.current[i] = smoothTimeRef.current[i] * smoothFactor + normalized * (1 - smoothFactor);
      }

      const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.clearRect(0, 0, width, height);

        if (mode === 'bars') {
          drawBars(ctx, smoothFrequencyRef.current, width, height, options);
        } else if (mode === 'waveform') {
          drawWaveform(ctx, smoothTimeRef.current, width, height, options);
        } else {
          drawCircular(ctx, smoothFrequencyRef.current, width, height, options);
        }

        drawProgress(ctx, width, height, duration, currentTime);
      };

      draw(context, displayWidth, displayHeight);
      draw(exportContext, 1920, 1080);
      frame = requestAnimationFrame(renderFrame);
    };

    frame = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(frame);
  }, [mode, frequencyData, timeData, duration, currentTime, options]);

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
