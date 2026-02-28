'use client';

import { useEffect, useRef } from 'react';

export type VisualizationMode = 'bars' | 'waveform' | 'circular';

interface VisualizationCanvasProps {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  mode: VisualizationMode;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  bassIntensity: number; // 0-1, for bass pulse effect
}

export function VisualizationCanvas({
  frequencyData,
  timeData,
  mode,
  isPlaying,
  duration,
  currentTime,
  onSeek,
  bassIntensity,
}: VisualizationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>();

  // Initialize off-screen canvas for video export
  useEffect(() => {
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = new OffscreenCanvas(1920, 1080);
    }
  }, []);

  // Draw bars visualization
  const drawBars = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
    ctx.fillRect(0, 0, width, height);

    const barWidth = width / frequencyData.length * 2.5;
    const gradient = (ctx as any).createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f97316');
    gradient.addColorStop(0.5, '#fb923c');
    gradient.addColorStop(1, '#fdba74');

    for (let i = 0; i < frequencyData.length; i++) {
      const barHeight = (frequencyData[i] / 255) * height * 0.8;
      const x = i * barWidth;

      ctx.fillStyle = gradient;
      ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
    }

    // Draw progress line
    const progress = duration > 0 ? (currentTime / duration) * width : 0;
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progress, 0);
    ctx.lineTo(progress, height);
    ctx.stroke();
  };

  // Draw waveform visualization
  const drawWaveform = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
    ctx.fillRect(0, 0, width, height);

    const centerY = height / 2;
    const gradient = (ctx as any).createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f97316');
    gradient.addColorStop(0.5, '#fb923c');
    gradient.addColorStop(1, '#fdba74');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const sliceWidth = width / timeData.length;
    let x = 0;

    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i] / 128;
      const y = v * centerY;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();

    // Draw progress line
    const progress = duration > 0 ? (currentTime / duration) * width : 0;
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progress, 0);
    ctx.lineTo(progress, height);
    ctx.stroke();
  };

  // Draw circular spectrum visualization
  const drawCircular = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(centerX, centerY) * 0.8;

    // Draw background circle
    ctx.strokeStyle = 'rgba(248, 113, 22, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw frequency bars in circular pattern
    const bars = frequencyData.length;
    const barWidth = (Math.PI * 2) / bars;

    for (let i = 0; i < bars; i++) {
      const angle = i * barWidth - Math.PI / 2;
      const value = frequencyData[i] / 255;
      const radius = maxRadius * value;

      const x1 = centerX + Math.cos(angle) * maxRadius;
      const y1 = centerY + Math.sin(angle) * maxRadius;
      const x2 = centerX + Math.cos(angle) * radius;
      const y2 = centerY + Math.sin(angle) * radius;

      // Color based on frequency band
      const hue = (i / bars) * 360;
      const saturation = 50 + value * 50;
      ctx.strokeStyle = `hsl(${hue}, ${saturation}%, 50%)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Draw inner circle
    ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Draw progress indicator
    const progress = duration > 0 ? (currentTime / duration) * (Math.PI * 2) : 0;
    const progressRadius = maxRadius + 20;
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(
      centerX + Math.cos(progress - Math.PI / 2) * progressRadius,
      centerY + Math.sin(progress - Math.PI / 2) * progressRadius,
      8,
      0,
      Math.PI * 2
    );
    ctx.fill();
  };

  // Handle canvas click for seeking
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (x / width) * duration;

    onSeek(newTime);
  };

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      // Set canvas resolution
      canvas.width = width;
      canvas.height = height;

      // Draw based on mode
      if (mode === 'bars') {
        drawBars(ctx, width, height);
      } else if (mode === 'waveform') {
        drawWaveform(ctx, width, height);
      } else if (mode === 'circular') {
        drawCircular(ctx, width, height);
      }

      // Also render to off-screen canvas for video export
      if (offscreenCanvasRef.current) {
        const offscreenCtx = offscreenCanvasRef.current.getContext('2d');
        if (offscreenCtx) {
          const offscreenWidth = 1920;
          const offscreenHeight = 1080;

          if (mode === 'bars') {
            drawBars(offscreenCtx, offscreenWidth, offscreenHeight);
          } else if (mode === 'waveform') {
            drawWaveform(offscreenCtx, offscreenWidth, offscreenHeight);
          } else if (mode === 'circular') {
            drawCircular(offscreenCtx, offscreenWidth, offscreenHeight);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mode, frequencyData, timeData, currentTime, duration, bassIntensity]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      className="w-full h-full cursor-crosshair bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
    />
  );
}

export { VisualizationCanvas as default };
