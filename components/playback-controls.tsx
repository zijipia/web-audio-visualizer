'use client';

import { BarChart3, Circle, Pause, Play, SlidersHorizontal, Volume2, Waves } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { SpectrumOptions, VisualizationMode } from './visualization-canvas';

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  mode: VisualizationMode;
  spectrumOptions: SpectrumOptions;
  onSpectrumOptionsChange: (next: SpectrumOptions) => void;
  onModeChange: (mode: VisualizationMode) => void;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
}

const MODES: { id: VisualizationMode; icon: ReactNode; label: string }[] = [
  { id: 'bars', icon: <BarChart3 size={16} />, label: 'Bars' },
  { id: 'waveform', icon: <Waves size={16} />, label: 'Waveform' },
  { id: 'circular', icon: <Circle size={16} />, label: 'Circular' },
];

export function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  isLoading,
  mode,
  spectrumOptions,
  onSpectrumOptionsChange,
  onModeChange,
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
}: PlaybackControlsProps) {
  const [showSpectrumOptions, setShowSpectrumOptions] = useState(false);

  const formatTime = (value: number) => {
    if (!Number.isFinite(value)) return '0:00';
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-30 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl md:inset-x-8">
      <div className="mb-3">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => onSeek(Number(event.target.value))}
          className="h-1.5 w-full"
          aria-label="Seek"
        />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={isPlaying ? onPause : onPlay}
            disabled={isLoading}
            className="rounded-full bg-orange-500 p-3 text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>

          <span className="font-mono text-sm text-slate-100">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <button
            onClick={() => setShowSpectrumOptions((value) => !value)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-slate-900/50 px-3 py-2 text-xs text-slate-100 hover:bg-slate-800/70"
          >
            <SlidersHorizontal size={14} /> Spectrum
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/40 p-1">
          {MODES.map((item) => (
            <button
              key={item.id}
              onClick={() => onModeChange(item.id)}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition ${
                mode === item.id ? 'bg-orange-500 text-white' : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 md:w-44">
          <Volume2 size={18} className="text-slate-100" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(event) => onVolumeChange(Number(event.target.value))}
            className="h-1.5 w-full"
            aria-label="Volume"
          />
        </div>
      </div>

      {showSpectrumOptions && (
        <div className="mt-3 grid gap-3 rounded-xl border border-white/10 bg-slate-950/45 p-3 text-xs text-slate-200 md:grid-cols-3">
          <label className="space-y-1">
            <span>Density ({spectrumOptions.density})</span>
            <input
              type="range"
              min={24}
              max={220}
              step={1}
              value={spectrumOptions.density}
              onChange={(event) =>
                onSpectrumOptionsChange({ ...spectrumOptions, density: Number(event.target.value) })
              }
            />
          </label>

          <label className="space-y-1">
            <span>Sensitivity ({spectrumOptions.sensitivity.toFixed(2)})</span>
            <input
              type="range"
              min={0.6}
              max={2.2}
              step={0.01}
              value={spectrumOptions.sensitivity}
              onChange={(event) =>
                onSpectrumOptionsChange({ ...spectrumOptions, sensitivity: Number(event.target.value) })
              }
            />
          </label>

          <label className="space-y-1">
            <span>Smoothing ({spectrumOptions.smoothing.toFixed(2)})</span>
            <input
              type="range"
              min={0.2}
              max={0.95}
              step={0.01}
              value={spectrumOptions.smoothing}
              onChange={(event) =>
                onSpectrumOptionsChange({ ...spectrumOptions, smoothing: Number(event.target.value) })
              }
            />
          </label>

          <label className="space-y-1">
            <span>Wave line ({spectrumOptions.lineWidth.toFixed(1)})</span>
            <input
              type="range"
              min={1}
              max={7}
              step={0.5}
              value={spectrumOptions.lineWidth}
              onChange={(event) =>
                onSpectrumOptionsChange({ ...spectrumOptions, lineWidth: Number(event.target.value) })
              }
            />
          </label>

          <label className="space-y-1">
            <span>Palette</span>
            <select
              className="w-full rounded-md border border-white/10 bg-slate-900/70 px-2 py-1"
              value={spectrumOptions.palette}
              onChange={(event) =>
                onSpectrumOptionsChange({
                  ...spectrumOptions,
                  palette: event.target.value as SpectrumOptions['palette'],
                })
              }
            >
              <option value="sunset">Sunset</option>
              <option value="neon">Neon</option>
              <option value="ocean">Ocean</option>
            </select>
          </label>

          <label className="inline-flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              checked={spectrumOptions.mirror}
              onChange={(event) =>
                onSpectrumOptionsChange({ ...spectrumOptions, mirror: event.target.checked })
              }
            />
            Mirror bars mode
          </label>
        </div>
      )}
    </div>
  );
}
