'use client';

import { useEffect, useRef } from 'react';


interface BassPulseBackgroundProps {
  bassIntensity: number;
  backgroundImage: string | null;
}

export function BassPulseBackground({ bassIntensity, backgroundImage }: BassPulseBackgroundProps) {
  const imageLayerRef = useRef<HTMLDivElement>(null);
  const glowLayerRef = useRef<HTMLDivElement>(null);
  const smoothIntensityRef = useRef(0);

  useEffect(() => {
    let frame = 0;

    const animate = () => {
      const next = smoothIntensityRef.current + (bassIntensity - smoothIntensityRef.current) * 0.18;
      smoothIntensityRef.current = next;

      const scale = 1 + next * 0.12;
      const opacity = Math.min(0.24, next * 0.3);

      if (imageLayerRef.current) {
        imageLayerRef.current.style.transform = `translate3d(0,0,0) scale(${scale})`;
      }

      if (glowLayerRef.current) {
        glowLayerRef.current.style.opacity = String(opacity);
      }

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [bassIntensity]);


  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div
        ref={imageLayerRef}
        className="absolute inset-0 bg-cover bg-center will-change-transform"
        style={{
          transform: 'translate3d(0,0,0) scale(1)',
          backgroundImage: backgroundImage
            ? `url(${backgroundImage})`
            : 'linear-gradient(135deg, #0a0e27 0%, #111833 45%, #0d132d 100%)',
          filter: 'brightness(0.55)',
        }}
      />
      <div className="absolute inset-0 bg-[#050812]/45" />
      <div
        ref={glowLayerRef}
        className="absolute inset-0 will-change-opacity"
        style={{
          opacity: 0,
          background:
            'radial-gradient(circle at 50% 45%, rgba(251,146,60,0.75) 0%, rgba(245,158,11,0.3) 26%, rgba(2,132,199,0.1) 70%, transparent 100%)',
        }}
      />
    </div>
  );
}
