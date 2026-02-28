'use client';

import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
}

export function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  isLoading,
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
}: PlaybackControlsProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const [isSeekingProgress, setIsSeekingProgress] = useState(false);
  const [isSeekingVolume, setIsSeekingVolume] = useState(false);

  const formatTime = (time: number): string => {
    if (!isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressMouseDown = useCallback(() => {
    setIsSeekingProgress(true);
  }, []);

  const handleProgressMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newTime = (x / rect.width) * duration;
      onSeek(newTime);
      setIsSeekingProgress(false);
    },
    [duration, onSeek]
  );

  const handleProgressMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isSeekingProgress || !progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newTime = (x / rect.width) * duration;
      onSeek(newTime);
    },
    [isSeekingProgress, duration, onSeek]
  );

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      onVolumeChange(newVolume);
    },
    [onVolumeChange]
  );

  useEffect(() => {
    if (!isSeekingProgress) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newTime = (x / rect.width) * duration;
      onSeek(newTime);
    };

    const handleMouseUp = () => {
      setIsSeekingProgress(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSeekingProgress, duration, onSeek]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950 to-slate-950/90 backdrop-blur-xl border-t border-slate-800/50 px-6 py-4 space-y-4">
      {/* Progress Bar */}
      <div
        ref={progressRef}
        onMouseDown={handleProgressMouseDown}
        onMouseMove={handleProgressMove}
        onMouseUp={handleProgressMouseUp}
        className="w-full h-1 bg-slate-800 rounded-full cursor-pointer group hover:h-2 transition-all duration-200"
      >
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-75"
          style={{ width: `${progressPercent}%` }}
        />
        {/* Seek thumb */}
        <div
          className="relative -top-1.5 -right-0.5 w-4 h-4 bg-orange-400 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{ left: `calc(${progressPercent}% - 8px)` }}
        />
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between">
        {/* Left Side - Play/Pause */}
        <div className="flex items-center gap-4">
          <button
            onClick={isPlaying ? onPause : onPlay}
            disabled={isLoading}
            className="p-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 active:scale-95"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <div className="animate-spin">
                <Play size={24} />
              </div>
            ) : isPlaying ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} fill="currentColor" />
            )}
          </button>

          {/* Time Display */}
          <div className="flex items-center gap-2 text-sm font-mono text-slate-300">
            <span>{formatTime(currentTime)}</span>
            <span className="text-slate-600">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Side - Volume */}
        <div className="flex items-center gap-3">
          {volume === 0 ? (
            <VolumeX size={20} className="text-slate-400" />
          ) : (
            <Volume2 size={20} className="text-slate-400" />
          )}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer accent-orange-500"
          />
          <span className="w-10 text-right text-xs text-slate-500 font-mono">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
