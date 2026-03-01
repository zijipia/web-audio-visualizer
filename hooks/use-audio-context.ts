"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
	getRecordingStream: () => MediaStream | null;
	cleanup: () => void;
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

	const frequencyDataRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(1024));
	const timeDataRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(1024));

	const initializeAudioContext = useCallback(() => {
		if (audioContextRef.current) {
			return audioContextRef.current;
		}

		const context = new window.AudioContext();
		const analyser = context.createAnalyser();
		analyser.fftSize = 8192;
		analyser.smoothingTimeConstant = 0.5;

		const gainNode = context.createGain();
		gainNode.gain.value = state.volume;

		const recordingDestination = context.createMediaStreamDestination();

		analyser.connect(gainNode);
		gainNode.connect(context.destination);
		gainNode.connect(recordingDestination);

		frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
		timeDataRef.current = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;

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
		element.preload = "auto";
		element.crossOrigin = "anonymous";

		element.addEventListener("play", () => {
			setState((prev) => ({ ...prev, isPlaying: true }));
		});

		element.addEventListener("pause", () => {
			setState((prev) => ({ ...prev, isPlaying: false }));
		});

		element.addEventListener("ended", () => {
			setState((prev) => ({ ...prev, isPlaying: false }));
		});

		element.addEventListener("timeupdate", () => {
			setState((prev) => ({ ...prev, currentTime: element.currentTime }));
		});

		element.addEventListener("loadedmetadata", () => {
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

	const loadAudio = useCallback(
		async (file: File) => {
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
		},
		[connectGraph, ensureAudioElement, initializeAudioContext],
	);

	const play = useCallback(async () => {
		const audioElement = audioElementRef.current;
		if (!audioElement?.src) {
			return;
		}

		const context = initializeAudioContext();
		if (context.state === "suspended") {
			await context.resume();
		}

		await audioElement.play();
	}, [initializeAudioContext]);

	const pause = useCallback(() => {
		audioElementRef.current?.pause();
	}, []);

	const seek = useCallback(
		(time: number) => {
			const element = audioElementRef.current;
			if (!element) return;

			const boundedTime = Math.max(0, Math.min(time, state.duration || 0));
			element.currentTime = boundedTime;
			setState((prev) => ({ ...prev, currentTime: boundedTime }));
		},
		[state.duration],
	);

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
			audioElementRef.current.src = "";
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
