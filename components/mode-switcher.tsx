'use client';

import { AudioLines, BarChart3, Circle, Waves } from 'lucide-react';
import type { VisualizationMode } from './visualization-canvas';

interface ModeSwitcherProps {
  currentMode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
}

const modes: { id: VisualizationMode; label: string; icon: React.ReactNode }[] = [
  {
    id: 'bars',
    label: 'Bars',
    icon: <BarChart3 size={20} />,
  },
  {
    id: 'waveform',
    label: 'Waveform',
    icon: <Waves size={20} />,
  },
  {
    id: 'reflective',
    label: 'Reflective',
    icon: <AudioLines size={20} />,
  },
  {
    id: 'layered-wave',
    label: 'Layered Wave',
    icon: <Waves size={20} />,
  },
  {
    id: 'circular',
    label: 'Circular',
    icon: <Circle size={20} />,
  },
];

export function ModeSwitcher({ currentMode, onModeChange }: ModeSwitcherProps) {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
      <div className="flex gap-2 p-1 rounded-lg bg-slate-800/50 backdrop-blur-sm border border-slate-700/50">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`p-2 rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${
              currentMode === mode.id
                ? 'bg-orange-500 text-white shadow-lg'
                : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/50'
            }`}
            title={mode.label}
          >
            {mode.icon}
            <span className="hidden sm:inline text-sm font-medium">{mode.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
