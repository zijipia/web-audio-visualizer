'use client';

interface BassPulseBackgroundProps {
  backgroundImage: string | null;
  bassIntensity: number;
}

export function BassPulseBackground({ backgroundImage, bassIntensity }: BassPulseBackgroundProps) {
  const scale = 1 + bassIntensity * 0.15;

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-150 ease-out"
        style={{
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
          backgroundColor: '#0a0e27',
          transform: `scale(${scale})`,
          filter: `brightness(${1 + bassIntensity * 0.2})`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e27]/80 via-[#101938]/70 to-[#0a0e27]/90" />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at center, rgba(251,146,60,${bassIntensity * 0.28}) 0%, transparent 68%)`,
        }}
      />
    </div>
  );
}
