'use client';

import { useMemo } from 'react';

interface BassPulseBackgroundProps {
  bassIntensity: number;
  backgroundImage: string | null;
}

export function BassPulseBackground({ bassIntensity, backgroundImage }: BassPulseBackgroundProps) {
  const scale = useMemo(() => 1 + bassIntensity * 0.15, [bassIntensity]);
  const flashOpacity = useMemo(() => Math.min(0.3, bassIntensity * 0.35), [bassIntensity]);

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 transition-transform duration-150 ease-out bg-cover bg-center"
        style={{
          transform: `scale(${scale})`,
          backgroundImage: backgroundImage
            ? `url(${backgroundImage})`
            : 'linear-gradient(135deg, #0a0e27 0%, #111833 45%, #0d132d 100%)',
          filter: 'brightness(0.55)',
        }}
      />
      <div className="absolute inset-0 bg-[#050812]/45" />
      <div
        className="absolute inset-0 transition-opacity duration-150"
        style={{
          opacity: flashOpacity,
          background:
            'radial-gradient(circle at 50% 45%, rgba(251,146,60,0.8) 0%, rgba(245,158,11,0.35) 25%, rgba(2,132,199,0.12) 70%, transparent 100%)',
        }}
      />
    </div>
  );
}
