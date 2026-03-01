'use client';

import { useEffect, useRef } from 'react';

interface BassPulseBackgroundProps {
  bassIntensity: number;
  backgroundImage: string | null;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
  alpha: number;
}

const PARTICLE_COUNT = 120;

function createParticles(width: number, height: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: 0.7 + Math.random() * 2.4,
    speedX: (Math.random() - 0.5) * 0.35,
    speedY: -0.15 - Math.random() * 0.55,
    alpha: 0.15 + Math.random() * 0.45,
  }));
}

export function BassPulseBackground({ bassIntensity, backgroundImage }: BassPulseBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const smoothIntensityRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (!backgroundImage) {
      imageRef.current = null;
      return;
    }

    const image = new Image();
    image.src = backgroundImage;
    image.onload = () => {
      imageRef.current = image;
    };

    return () => {
      imageRef.current = null;
    };
  }, [backgroundImage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let frame = 0;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(canvas.clientWidth));
      const height = Math.max(1, Math.floor(canvas.clientHeight));

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        particlesRef.current = createParticles(width, height);
      }

      if (!particlesRef.current.length) {
        particlesRef.current = createParticles(width, height);
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      const nextIntensity = smoothIntensityRef.current + (bassIntensity - smoothIntensityRef.current) * 0.16;
      smoothIntensityRef.current = nextIntensity;

      const pulse = 0.78 + nextIntensity * 0.5;
      const darkOverlay = 0.55 - nextIntensity * 0.28;
      const bloomAlpha = 0.15 + nextIntensity * 0.45;

      if (imageRef.current) {
        const image = imageRef.current;
        const imageRatio = image.width / image.height;
        const canvasRatio = width / height;

        let drawWidth = width;
        let drawHeight = height;
        if (imageRatio > canvasRatio) {
          drawHeight = height;
          drawWidth = height * imageRatio;
        } else {
          drawWidth = width;
          drawHeight = width / imageRatio;
        }

        const zoom = 1 + nextIntensity * 0.12;
        const scaledWidth = drawWidth * zoom;
        const scaledHeight = drawHeight * zoom;
        const drawX = (width - scaledWidth) / 2;
        const drawY = (height - scaledHeight) / 2;

        context.globalAlpha = 1;
        context.filter = `brightness(${pulse}) saturate(${1 + nextIntensity * 0.6})`;
        context.drawImage(image, drawX, drawY, scaledWidth, scaledHeight);
        context.filter = 'none';
      } else {
        const gradient = context.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#090d22');
        gradient.addColorStop(0.5, '#111a36');
        gradient.addColorStop(1, '#070c1d');
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
      }

      context.fillStyle = `rgba(4, 7, 18, ${Math.max(0.2, darkOverlay)})`;
      context.fillRect(0, 0, width, height);

      const glowGradient = context.createRadialGradient(width * 0.5, height * 0.45, 20, width * 0.5, height * 0.45, Math.max(width, height) * 0.7);
      glowGradient.addColorStop(0, `rgba(251, 146, 60, ${bloomAlpha})`);
      glowGradient.addColorStop(0.45, `rgba(56, 189, 248, ${bloomAlpha * 0.5})`);
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.fillStyle = glowGradient;
      context.fillRect(0, 0, width, height);

      context.globalCompositeOperation = 'lighter';
      for (const particle of particlesRef.current) {
        particle.x += particle.speedX * (1 + nextIntensity * 1.7);
        particle.y += particle.speedY * (1 + nextIntensity * 2.4);

        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;
        if (particle.y < -25) {
          particle.y = height + 25;
          particle.x = Math.random() * width;
        }

        const particleAlpha = particle.alpha * (0.4 + nextIntensity * 1.2);
        context.fillStyle = `rgba(125, 211, 252, ${Math.min(0.85, particleAlpha)})`;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius * (1 + nextIntensity * 0.8), 0, Math.PI * 2);
        context.fill();
      }
      context.globalCompositeOperation = 'source-over';

      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [bassIntensity]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />;
}
