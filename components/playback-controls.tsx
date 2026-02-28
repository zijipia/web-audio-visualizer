'use client';

import { BarChart3, Circle, Pause, Play, SlidersHorizontal, Volume2, Waves } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { SpectrumColorScheme, SpectrumSettings, VisualizationMode } from './visualization-canvas';

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  mode: VisualizationMode;
  settings: SpectrumSettings;
  onSettingsChange: (next: SpectrumSettings) => void;
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

const SCHEMES: SpectrumColorScheme[] = ['sunset', 'neon', 'fire'];

export function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  isLoading,
  mode,
  settings,
  onSettingsChange,
  onModeChange,
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
}: PlaybackControlsProps) {
  const [showSettings, setShowSettings] = useState(false);

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
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-900/40 p-1">
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

          <button
            onClick={() => setShowSettings((prev) => !prev)}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition ${
              showSettings ? 'bg-cyan-500 text-white' : 'text-slate-200 hover:bg-white/10'
            }`}
          >
            <SlidersHorizontal size={15} /> Tune
          </button>
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

      {showSettings && (
        <div className="mt-3 grid gap-2 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-xs text-slate-200 md:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-1">
            <span>Bar count: {settings.barCount}</span>
            <input
              type="range"
              min={24}
              max={180}
              step={2}
              value={settings.barCount}
              onChange={(event) => onSettingsChange({ ...settings, barCount: Number(event.target.value) })}
            />
          </label>

          <label className="space-y-1">
            <span>Sensitivity: {settings.sensitivity.toFixed(2)}</span>
            <input
              type="range"
              min={0.6}
              max={2}
              step={0.05}
              value={settings.sensitivity}
              onChange={(event) => onSettingsChange({ ...settings, sensitivity: Number(event.target.value) })}
            />
          </label>

          <label className="space-y-1">
            <span>Line width: {settings.lineWidth.toFixed(1)}</span>
            <input
              type="range"
              min={1}
              max={8}
              step={0.5}
              value={settings.lineWidth}
              onChange={(event) => onSettingsChange({ ...settings, lineWidth: Number(event.target.value) })}
            />
          </label>

          <label className="space-y-1">
            <span>Radial boost: {settings.radialBoost.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={settings.radialBoost}
              onChange={(event) => onSettingsChange({ ...settings, radialBoost: Number(event.target.value) })}
            />
          </label>

          <label className="space-y-1">
            <span>Color scheme</span>
            <select
              className="w-full rounded-md border border-white/10 bg-slate-900/70 p-1"
              value={settings.colorScheme}
              onChange={(event) => onSettingsChange({ ...settings, colorScheme: event.target.value as SpectrumColorScheme })}
            >
              {SCHEMES.map((scheme) => (
                <option key={scheme} value={scheme}>
                  {scheme}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
