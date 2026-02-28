"use client";

import { useEffect, useState } from "react";

interface BassPulseProps {
  frequencyData: Uint8Array;
  backgroundImage: string | null;
}

export function BassPulse({ frequencyData, backgroundImage }: BassPulseProps) {
  const [bassIntensity, setBassIntensity] = useState(0);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    // Extract bass frequencies (first 10% of frequency data)
    const bassRange = frequencyData.slice(
      0,
      Math.floor(frequencyData.length * 0.1),
    );
    const average =
      bassRange.reduce((a, b) => a + b, 0) / bassRange.length / 255;

    setBassIntensity(average);

    // Calculate scale pulse: 1.0 to 1.1 based on bass intensity
    const pulseScale = 1 + average * 0.1;
    setScale(pulseScale);
  }, [frequencyData]);

  if (!backgroundImage) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 -z-10" />
    );
  }

  return (
    <>
      {/* Background Image with Bass Pulse */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center transition-transform duration-100"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          transform: `scale(${scale})`,
          opacity: 0.3 + scale,
        }}
      />

      {/* Overlay gradient */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-950/80 via-slate-900/70 to-slate-950/80" />

      {/* Bass pulse glow effect */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none transition-opacity duration-100"
        style={{
          background: `radial-gradient(circle at center, rgba(249, 115, 22, ${bassIntensity * 0.3}) 0%, transparent 70%)`,
        }}
      />
    </>
  );
}
