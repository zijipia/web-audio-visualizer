'use client';

import { BarChart3, Circle, Pause, Play, Volume2, Waves } from 'lucide-react';
import type { VisualizationMode } from './visualization-canvas';

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  mode: VisualizationMode;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onModeChange: (mode: VisualizationMode) => void;
}

const modeOptions: { value: VisualizationMode; icon: React.ReactNode; label: string }[] = [
  { value: 'bars', icon: <BarChart3 size={16} />, label: 'Bars' },
  { value: 'waveform', icon: <Waves size={16} />, label: 'Waveform' },
  { value: 'circular', icon: <Circle size={16} />, label: 'Circular' },
];

export function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  isLoading,
  mode,
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
  onModeChange,
}: PlaybackControlsProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-x-3 bottom-3 z-30 rounded-xl border border-white/15 bg-white/5 p-4 backdrop-blur-md md:inset-x-8">
      <div className="mb-3">
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={Math.min(currentTime, duration || 0)}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="w-full"
          aria-label="Seek audio"
        />
        <div className="mt-1 flex justify-between text-xs text-slate-300">
          <span>{formatTime(currentTime)}</span>
          <span>{progress.toFixed(0)}%</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={isLoading}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white transition hover:bg-orange-400 disabled:opacity-60"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>

        <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-black/20 p-1">
          {modeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onModeChange(option.value)}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                mode === option.value ? 'bg-cyan-500 text-slate-950' : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              {option.icon}
              <span className="hidden sm:inline">{option.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Volume2 size={16} className="text-slate-200" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-24"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}

function formatTime(time: number) {
  if (!Number.isFinite(time) || time < 0) return '0:00';
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
