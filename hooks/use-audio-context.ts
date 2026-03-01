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
  frequencyBands: FrequencyBands;
  audioElement: HTMLAudioElement | null;
  loadAudio: (file: File) => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  getRecordingStream: () => MediaStream | null;
  cleanup: () => void;
}

export interface FrequencyBandRange {
  minHz: number;
  maxHz: number;
}

export interface FrequencyBands {
  bass: number;
  mid: number;
  treble: number;
  bassIntensity: number;
  ranges: {
    bass: FrequencyBandRange;
    mid: FrequencyBandRange;
    treble: FrequencyBandRange;
  };
}

const BAND_RANGES: FrequencyBands['ranges'] = {
  bass: { minHz: 20, maxHz: 250 },
  mid: { minHz: 250, maxHz: 4000 },
  treble: { minHz: 4000, maxHz: 20000 },
};

function calculateBandEnergy(data: Uint8Array, sampleRate: number, range: FrequencyBandRange): number {
  if (!data.length || sampleRate <= 0) {
    return 0;
  }

  const nyquist = sampleRate / 2;
  const minIndex = Math.max(0, Math.floor((range.minHz / nyquist) * data.length));
  const maxIndex = Math.min(data.length - 1, Math.ceil((range.maxHz / nyquist) * data.length));

  if (maxIndex < minIndex) {
    return 0;
  }

  let sum = 0;
  let count = 0;
  for (let index = minIndex; index <= maxIndex; index += 1) {
    sum += data[index] ?? 0;
    count += 1;
  }

  return count > 0 ? sum / count / 255 : 0;
}

let sharedAudioContext: AudioContext | null = null;

export function useAudioContext(): UseAudioContextReturn {
  const audioContextRef = useRef<AudioContext | null>(sharedAudioContext);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const recordingDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isLoading: false,
  });

  const frequencyDataRef = useRef<Uint8Array>(new Uint8Array(1024));
  const timeDataRef = useRef<Uint8Array>(new Uint8Array(1024));
  const frequencyBandsRef = useRef<FrequencyBands>({
    bass: 0,
    mid: 0,
    treble: 0,
    bassIntensity: 0,
    ranges: BAND_RANGES,
  });

  const initializeAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      return audioContextRef.current;
    }

    const context = new window.AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    const gainNode = context.createGain();
    gainNode.gain.value = state.volume;

    const recordingDestination = context.createMediaStreamDestination();

    analyser.connect(gainNode);
    gainNode.connect(context.destination);
    gainNode.connect(recordingDestination);

    frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    timeDataRef.current = new Uint8Array(analyser.frequencyBinCount);

    analyserRef.current = analyser;
    gainNodeRef.current = gainNode;
    recordingDestinationRef.current = recordingDestination;

    audioContextRef.current = context;
    sharedAudioContext = context;

    return context;
  }, [state.volume]);

  const ensureAudioElement = useCallback(() => {
    if (audioElementRef.current) {
      return audioElementRef.current;
    }

    const element = new Audio();
    element.preload = 'auto';
    element.crossOrigin = 'anonymous';

    element.addEventListener('play', () => {
      setState((prev) => ({ ...prev, isPlaying: true }));
    });

    element.addEventListener('pause', () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
    });

    element.addEventListener('ended', () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
    });

    element.addEventListener('timeupdate', () => {
      setState((prev) => ({ ...prev, currentTime: element.currentTime }));
    });

    element.addEventListener('loadedmetadata', () => {
      setState((prev) => ({ ...prev, duration: Number.isFinite(element.duration) ? element.duration : 0 }));
    });

    audioElementRef.current = element;
    return element;
  }, []);

  const connectGraph = useCallback((context: AudioContext, audioElement: HTMLAudioElement) => {
    if (mediaSourceRef.current) {
      return;
    }

    const sourceNode = context.createMediaElementSource(audioElement);
    if (!analyserRef.current) {
      return;
    }

    sourceNode.connect(analyserRef.current);
    mediaSourceRef.current = sourceNode;
  }, []);

  const loadAudio = useCallback(async (file: File) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const context = initializeAudioContext();
      const audioElement = ensureAudioElement();

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }

      const nextUrl = URL.createObjectURL(file);
      audioUrlRef.current = nextUrl;

      connectGraph(context, audioElement);
      audioElement.src = nextUrl;
      audioElement.load();

      setState((prev) => ({ ...prev, currentTime: 0, duration: 0 }));
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [connectGraph, ensureAudioElement, initializeAudioContext]);

  const play = useCallback(async () => {
    const audioElement = audioElementRef.current;
    if (!audioElement?.src) {
      return;
    }

    const context = initializeAudioContext();
    if (context.state === 'suspended') {
      await context.resume();
    }

    await audioElement.play();
  }, [initializeAudioContext]);

  const pause = useCallback(() => {
    audioElementRef.current?.pause();
  }, []);

  const seek = useCallback((time: number) => {
    const element = audioElementRef.current;
    if (!element) return;

    const boundedTime = Math.max(0, Math.min(time, state.duration || 0));
    element.currentTime = boundedTime;
    setState((prev) => ({ ...prev, currentTime: boundedTime }));
  }, [state.duration]);

  const setVolume = useCallback((vol: number) => {
    const volume = Math.max(0, Math.min(1, vol));
    setState((prev) => ({ ...prev, volume }));

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
    if (audioElementRef.current) {
      audioElementRef.current.volume = volume;
    }
  }, []);

  const getRecordingStream = useCallback(() => {
    return recordingDestinationRef.current?.stream ?? null;
  }, []);

  const cleanup = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    let frameId = 0;

    const tick = () => {
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(frequencyDataRef.current);
        analyserRef.current.getByteTimeDomainData(timeDataRef.current);

        const sampleRate = audioContextRef.current?.sampleRate ?? 44100;
        const bass = calculateBandEnergy(frequencyDataRef.current, sampleRate, BAND_RANGES.bass);
        const mid = calculateBandEnergy(frequencyDataRef.current, sampleRate, BAND_RANGES.mid);
        const treble = calculateBandEnergy(frequencyDataRef.current, sampleRate, BAND_RANGES.treble);

        frequencyBandsRef.current = {
          bass,
          mid,
          treble,
          bassIntensity: bass,
          ranges: BAND_RANGES,
        };
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    state,
    audioContext: audioContextRef.current,
    analyser: analyserRef.current,
    frequencyData: frequencyDataRef.current,
    timeData: timeDataRef.current,
    frequencyBands: frequencyBandsRef.current,
    audioElement: audioElementRef.current,
    loadAudio,
    play,
    pause,
    seek,
    setVolume,
    getRecordingStream,
    cleanup,
  };
}
