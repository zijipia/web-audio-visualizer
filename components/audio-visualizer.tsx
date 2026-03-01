"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { PlaybackControls } from "@/components/playback-controls";
import { VideoExport } from "@/components/video-export";
import { VisualizationCanvas, type SpectrumSettings, type VisualizationMode } from "@/components/visualization-canvas";
import { useAudioContext } from "@/hooks/use-audio-context";

const DEFAULT_SETTINGS: SpectrumSettings = {
	frequencyBands: 96,
	startFrequency: 20,
	endFrequency: 16000,
	sensitivity: 1,
	thickness: 3,
	softness: 0.45,
	maxHeight: 400,
	audioDurationMs: 90,
	audioOffsetMs: 0,
	radialBoost: 0.75,
	rotationSpeed: 0.2,
	glow: 0,
	segmented: false,
	fallSpeed: 3,
	colorScheme: "sunset",
	mirror: true,
	overlayText: "",
	overlayMode: "text",
	overlayTextSize: 56,
	overlayTextY: 180,
	overlayTextOpacity: 0.9,
	overlayTextX: 0,
	overlayTextScale: 1,
	overlayTextBlur: 0,
	overlayTextWiggle: 8,
	overlayTextReactStrength: 0.45,
	overlayTextReactGlow: 0.55,
	overlayTextReactMinHz: 120,
	overlayTextReactMaxHz: 2400,
	backgroundScale: 1.08,
	backgroundBlur: 0,
	backgroundWiggle: 10,
	backgroundX: 0,
	backgroundY: 0,
	backgroundReactStrength: 0.12,
	backgroundGlow: 0.4,
	backgroundReactMinHz: 20,
	backgroundReactMaxHz: 220,
};

export function AudioVisualizer() {
	const audio = useAudioContext();

	const [audioFileName, setAudioFileName] = useState<string | null>(null);
	const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
	const [mode, setMode] = useState<VisualizationMode>("bars");
	const [overlayLogo, setOverlayLogo] = useState<string | null>(null);
	const [exportCanvas, setExportCanvas] = useState<HTMLCanvasElement | null>(null);
	const [settings, setSettings] = useState<SpectrumSettings>(DEFAULT_SETTINGS);

	const bassIntensity = useMemo(() => {
		if (!audio.frequencyData.length) return 0;
		const maxFrequency = 256;
		const nyquist = (audio.audioContext?.sampleRate ?? 44100) / 2;
		const count = Math.max(1, Math.floor((maxFrequency / nyquist) * audio.frequencyData.length));

		let sum = 0;
		for (let i = 0; i < count; i += 1) sum += audio.frequencyData[i] ?? 0;
		return Math.min(1, (sum / count / 255) * settings.sensitivity);
	}, [audio.audioContext?.sampleRate, audio.frequencyData, audio.state.currentTime, settings.sensitivity]);

	const loadAudio = useCallback(
		async (file: File) => {
			setAudioFileName(file.name);
			await audio.loadAudio(file);
		},
		[audio],
	);

	const loadBackground = useCallback((file: File) => {
		const nextUrl = URL.createObjectURL(file);
		setBackgroundImage((previous) => {
			if (previous) URL.revokeObjectURL(previous);
			return nextUrl;
		});
	}, []);

	const removeBackground = useCallback(() => {
		setBackgroundImage((previous) => {
			if (previous) URL.revokeObjectURL(previous);
			return null;
		});
	}, []);

	const loadOverlayLogo = useCallback((file: File) => {
		const nextUrl = URL.createObjectURL(file);
		setOverlayLogo((previous) => {
			if (previous) URL.revokeObjectURL(previous);
			return nextUrl;
		});
	}, []);

	const removeOverlayLogo = useCallback(() => {
		setOverlayLogo((previous) => {
			if (previous) URL.revokeObjectURL(previous);
			return null;
		});
	}, []);

	useEffect(() => {
		return () => {
			if (backgroundImage) URL.revokeObjectURL(backgroundImage);
			if (overlayLogo) URL.revokeObjectURL(overlayLogo);
		};
	}, [backgroundImage, overlayLogo]);

	return (
		<main className='relative h-screen w-full overflow-hidden text-slate-100'>
			<VisualizationCanvas
				frequencyData={audio.frequencyData}
				timeData={audio.timeData}
				mode={mode}
				sampleRate={audio.audioContext?.sampleRate ?? 44100}
				duration={audio.state.duration}
				currentTime={audio.state.currentTime}
				onSeek={audio.seek}
				bassIntensity={bassIntensity}
				backgroundImage={backgroundImage}
				overlayImage={overlayLogo}
				onExportCanvasReady={setExportCanvas}
				settings={settings}
			/>

			<FileUpload
				onAudioLoad={loadAudio}
				onBackgroundLoad={loadBackground}
				onOverlayLogoLoad={loadOverlayLogo}
				backgroundImage={backgroundImage}
				overlayLogo={overlayLogo}
				audioFileName={audioFileName}
				onRemoveBackground={removeBackground}
				onRemoveOverlayLogo={removeOverlayLogo}
			/>

			<VideoExport
				exportCanvas={exportCanvas}
				renderAudioStream={audio.getRecordingStream()}
				duration={audio.state.duration}
				currentTime={audio.state.currentTime}
				onStartRender={() => {
					audio.seek(0);
					audio.play().catch(() => {
						// user gesture restrictions may prevent autoplay in some browsers
					});
				}}
				onStopRender={audio.pause}
			/>

			<PlaybackControls
				isPlaying={audio.state.isPlaying}
				currentTime={audio.state.currentTime}
				duration={audio.state.duration}
				volume={audio.state.volume}
				isLoading={audio.state.isLoading}
				mode={mode}
				settings={settings}
				onSettingsChange={setSettings}
				onModeChange={setMode}
				onPlay={() => {
					audio.play().catch(() => {
						// autoplay restrictions are expected when no user gesture has occurred.
					});
				}}
				onPause={audio.pause}
				onSeek={audio.seek}
				onVolumeChange={audio.setVolume}
			/>

			{!audio.audioElement?.src && (
				<div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
					<div className='rounded-2xl border border-white/10 bg-slate-950/40 px-8 py-6 text-center backdrop-blur-xl'>
						<h1 className='text-3xl font-semibold'>Web Audio Visualizer</h1>
						<p className='mt-2 text-sm text-slate-300'>Upload an MP3 to start real-time visualization.</p>
					</div>
				</div>
			)}
		</main>
	);
}
