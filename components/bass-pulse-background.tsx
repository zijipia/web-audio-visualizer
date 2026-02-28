'use client';

import { useEffect, useRef } from 'react';

interface BassPulseBackgroundProps {
  frequencyData: Uint8Array;
  sampleRate?: number;
  backgroundImage: string | null;
}

export function BassPulseBackground({ frequencyData, sampleRate = 44100, backgroundImage }: BassPulseBackgroundProps) {
  const imageLayerRef = useRef<HTMLDivElement>(null);
  const glowLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    let smooth = 0;

    const update = () => {
      if (!frequencyData.length) {
        frame = requestAnimationFrame(update);
        return;
      }

      const nyquist = sampleRate / 2;
      const maxBassFrequency = 256;
      const bassBins = Math.max(1, Math.floor((maxBassFrequency / nyquist) * frequencyData.length));

      let sum = 0;
      for (let i = 0; i < bassBins; i += 1) sum += frequencyData[i] ?? 0;
      const intensity = Math.min(1, sum / bassBins / 255);
      smooth = smooth * 0.78 + intensity * 0.22;

      if (imageLayerRef.current) {
        imageLayerRef.current.style.transform = `translateZ(0) scale(${1 + smooth * 0.1})`;
        imageLayerRef.current.style.filter = `brightness(${0.52 + smooth * 0.25})`;
      }

      if (glowLayerRef.current) {
        glowLayerRef.current.style.opacity = String(Math.min(0.32, smooth * 0.35));
      }

      frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [frequencyData, sampleRate]);

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div
        ref={imageLayerRef}
        className="absolute inset-0 bg-cover bg-center will-change-transform"
        style={{
          transform: 'translateZ(0) scale(1)',
          backgroundImage: backgroundImage
            ? `url(${backgroundImage})`
            : 'linear-gradient(135deg, #0a0e27 0%, #111833 45%, #0d132d 100%)',
          filter: 'brightness(0.54)',
        }}
      />
      <div className="absolute inset-0 bg-[#050812]/45" />
      <div
        ref={glowLayerRef}
        className="absolute inset-0 will-change-opacity"
        style={{
          opacity: 0,
          background:
            'radial-gradient(circle at 50% 45%, rgba(251,146,60,0.8) 0%, rgba(245,158,11,0.35) 25%, rgba(2,132,199,0.12) 70%, transparent 100%)',
        }}
      />
    </div>
  );
}
