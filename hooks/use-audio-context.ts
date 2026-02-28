'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
}

export interface UseAudioContextReturn {
  state: AudioState;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  audioElement: HTMLAudioElement | null;
  loadAudio: (file: File) => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  getAudioTrack: () => MediaStreamTrack | null;
  cleanup: () => void;
}

export function useAudioContext(): UseAudioContextReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const mediaDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    isLoading: false,
  });

  const frequencyDataRef = useRef<Uint8Array>(new Uint8Array(1024));
  const timeDataRef = useRef<Uint8Array>(new Uint8Array(1024));

  const initialize = useCallback(() => {
    if (audioContextRef.current) return;

    const context = new window.AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    const gainNode = context.createGain();
    gainNode.gain.value = state.volume;

    const mediaDestination = context.createMediaStreamDestination();

    analyser.connect(gainNode);
    gainNode.connect(context.destination);
    gainNode.connect(mediaDestination);

    audioContextRef.current = context;
    analyserRef.current = analyser;
    gainNodeRef.current = gainNode;
    mediaDestinationRef.current = mediaDestination;
    frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    timeDataRef.current = new Uint8Array(analyser.frequencyBinCount);
  }, [state.volume]);

  const ensureAudioElement = useCallback(() => {
    if (audioElementRef.current) return audioElementRef.current;

    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';

    audio.addEventListener('play', () => {
      setState((prev) => ({ ...prev, isPlaying: true }));
    });

    audio.addEventListener('pause', () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
    });

    audio.addEventListener('timeupdate', () => {
      setState((prev) => ({ ...prev, currentTime: audio.currentTime }));
    });

    audio.addEventListener('loadedmetadata', () => {
      setState((prev) => ({ ...prev, duration: Number.isFinite(audio.duration) ? audio.duration : 0 }));
    });

    audio.addEventListener('ended', () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
    });

    audioElementRef.current = audio;
    return audio;
  }, []);

  const loadAudio = useCallback(async (file: File) => {
    initialize();
    setState((prev) => ({ ...prev, isLoading: true, currentTime: 0, duration: 0 }));

    const audio = ensureAudioElement();

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    const url = URL.createObjectURL(file);
    audioUrlRef.current = url;
    audio.src = url;

    if (!mediaSourceRef.current && audioContextRef.current && analyserRef.current) {
      const source = audioContextRef.current.createMediaElementSource(audio);
      source.connect(analyserRef.current);
      mediaSourceRef.current = source;
    }

    audio.load();
    setState((prev) => ({ ...prev, isLoading: false }));
  }, [ensureAudioElement, initialize]);

  const play = useCallback(async () => {
    const audio = audioElementRef.current;
    const context = audioContextRef.current;
    if (!audio || !audio.src || !context) return;

    if (context.state === 'suspended') {
      await context.resume();
    }

    await audio.play();
  }, []);

  const pause = useCallback(() => {
    audioElementRef.current?.pause();
  }, []);

  const seek = useCallback(
    (time: number) => {
      const audio = audioElementRef.current;
      if (!audio) return;
      audio.currentTime = Math.max(0, Math.min(time, state.duration || 0));
    },
    [state.duration]
  );

  const setVolume = useCallback((vol: number) => {
    const safeVolume = Math.max(0, Math.min(1, vol));
    setState((prev) => ({ ...prev, volume: safeVolume }));

    if (gainNodeRef.current) gainNodeRef.current.gain.value = safeVolume;
    if (audioElementRef.current) audioElementRef.current.volume = safeVolume;
  }, []);

  const getAudioTrack = useCallback(() => {
    const track = mediaDestinationRef.current?.stream.getAudioTracks()[0] ?? null;
    return track;
  }, []);

  const cleanup = useCallback(() => {
    const audio = audioElementRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }

    audioContextRef.current = null;
    mediaSourceRef.current = null;
    analyserRef.current = null;
    gainNodeRef.current = null;
    mediaDestinationRef.current = null;
    audioElementRef.current = null;
  }, []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(frequencyDataRef.current);
        analyserRef.current.getByteTimeDomainData(timeDataRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  return {
    state,
    audioContext: audioContextRef.current,
    analyser: analyserRef.current,
    frequencyData: frequencyDataRef.current,
    timeData: timeDataRef.current,
    audioElement: audioElementRef.current,
    loadAudio,
    play,
    pause,
    seek,
    setVolume,
    getAudioTrack,
    cleanup,
  };
}
