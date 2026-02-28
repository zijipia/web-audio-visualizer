'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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
  mediaSource: MediaElementAudioSourceNode | null;
  loadAudio: (file: File) => Promise<void>;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  setAudioFile: (url: string) => void;
  getAudioTrack: () => MediaStreamTrack | null;
  cleanup: () => void;
}

export function useAudioContext(): UseAudioContextReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    isLoading: false,
  });

  const frequencyDataRef = useRef<Uint8Array>(new Uint8Array(256));
  const timeDataRef = useRef<Uint8Array>(new Uint8Array(256));

  // Initialize Audio Context
  const initializeAudioContext = useCallback(() => {
    if (audioContextRef.current) return;

    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = context;

    // Create analyser node
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.85;
    analyserRef.current = analyser;

    // Create gain node for volume control
    const gainNode = context.createGain();
    gainNode.gain.value = state.volume;
    gainNodeRef.current = gainNode;

    // Connect nodes
    if (mediaSourceRef.current) {
      mediaSourceRef.current.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(context.destination);
    }

    frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    timeDataRef.current = new Uint8Array(analyser.frequencyBinCount);

    return context;
  }, [state.volume]);

  // Load audio file
  const loadAudio = useCallback(async (file: File) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const url = URL.createObjectURL(file);
      setAudioFile(url);
    } catch (error) {
      console.error('[v0] Error loading audio:', error);
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Set audio file by URL
  const setAudioFile = useCallback((url: string) => {
    if (!audioElementRef.current) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audioElementRef.current = audio;

      // Setup audio context on first interaction
      audio.addEventListener('play', () => {
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }
      });

      // Update time
      audio.addEventListener('timeupdate', () => {
        setState((prev) => ({
          ...prev,
          currentTime: audio.currentTime,
        }));
      });

      // Update duration
      audio.addEventListener('loadedmetadata', () => {
        setState((prev) => ({
          ...prev,
          duration: audio.duration,
        }));
      });

      // Update playing state
      audio.addEventListener('play', () => {
        setState((prev) => ({ ...prev, isPlaying: true }));
      });

      audio.addEventListener('pause', () => {
        setState((prev) => ({ ...prev, isPlaying: false }));
      });
    }

    audioElementRef.current.src = url;

    // Initialize audio context immediately and connect to media source
    if (!mediaSourceRef.current) {
      const context = initializeAudioContext();
      const mediaSource = context.createMediaElementAudioSource(
        audioElementRef.current
      );
      mediaSourceRef.current = mediaSource;

      if (analyserRef.current && gainNodeRef.current) {
        mediaSource.connect(analyserRef.current);
        analyserRef.current.connect(gainNodeRef.current);
        gainNodeRef.current.connect(context.destination);
      }
    }
  }, [initializeAudioContext]);

  // Play audio
  const play = useCallback(() => {
    if (audioElementRef.current && audioElementRef.current.src) {
      // Resume suspended audio context if needed
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      audioElementRef.current.play().catch((err) => {
        console.error('[v0] Playback failed:', err);
      });
    } else {
      console.warn('[v0] No audio loaded. Please upload an audio file first.');
    }
  }, []);

  // Pause audio
  const pause = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
  }, []);

  // Seek to time
  const seek = useCallback((time: number) => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = Math.max(0, Math.min(time, state.duration));
    }
  }, [state.duration]);

  // Set volume
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

  // Get frequency and time domain data
  const getFrequencyData = useCallback(() => {
    if (analyserRef.current) {
      analyserRef.current.getByteFrequencyData(frequencyDataRef.current);
      analyserRef.current.getByteTimeDomainData(timeDataRef.current);
    }
  }, []);

  // Get audio track for video recording
  const getAudioTrack = useCallback(() => {
    if (!audioContextRef.current) return null;

    try {
      const dest = audioContextRef.current.createMediaStreamDestination();
      if (mediaSourceRef.current && gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current.connect(dest);
        gainNodeRef.current.connect(audioContextRef.current.destination);
      }
      return dest.stream.getAudioTracks()[0] || null;
    } catch (error) {
      console.error('[v0] Error getting audio track:', error);
      return null;
    }
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    // Stop audio element
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }

    // Revoke blob URLs
    if (audioElementRef.current?.src) {
      try {
        URL.revokeObjectURL(audioElementRef.current.src);
      } catch (e) {
        // Ignore errors when revoking URLs
      }
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    gainNodeRef.current = null;
    mediaSourceRef.current = null;
  }, []);

  // Update frequency data on animation frame
  useEffect(() => {
    let animationFrameId: number;

    const updateData = () => {
      getFrequencyData();
      animationFrameId = requestAnimationFrame(updateData);
    };

    animationFrameId = requestAnimationFrame(updateData);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [getFrequencyData]);

  // Cleanup on unmount
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
    audioElement: audioElementRef.current,
    mediaSource: mediaSourceRef.current,
    loadAudio,
    play,
    pause,
    seek,
    setVolume,
    setAudioFile,
    getAudioTrack,
    cleanup,
  };
}
