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
};

export function AudioVisualizer() {
	const audio = useAudioContext();

	const [audioFileName, setAudioFileName] = useState<string | null>(null);
	const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
	const [mode, setMode] = useState<VisualizationMode>("bars");
	const [exportCanvas, setExportCanvas] = useState<HTMLCanvasElement | null>(null);
	const [settings, setSettings] = useState<SpectrumSettings>(DEFAULT_SETTINGS);
	const [overlayText, setOverlayText] = useState("");
	const [overlayTextColor, setOverlayTextColor] = useState("#ffffff");
	const [overlayTextSize, setOverlayTextSize] = useState(48);

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

	useEffect(() => {
		return () => {
			if (backgroundImage) URL.revokeObjectURL(backgroundImage);
		};
	}, [backgroundImage]);

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
				onExportCanvasReady={setExportCanvas}
				settings={settings}
				overlayText={overlayText}
				overlayTextColor={overlayTextColor}
				overlayTextSize={overlayTextSize}
			/>

			<FileUpload
				onAudioLoad={loadAudio}
				onBackgroundLoad={loadBackground}
				backgroundImage={backgroundImage}
				audioFileName={audioFileName}
				onRemoveBackground={removeBackground}
			/>

			<VideoExport
				exportCanvas={exportCanvas}
				renderAudioStream={audio.getRecordingStream()}
				duration={audio.state.duration}
				currentTime={audio.state.currentTime}
				audioElement={audio.audioElement}
				onSeek={audio.seek}
				onPlay={audio.play}
				onPause={audio.pause}
			/>

			<div className='pointer-events-auto fixed left-3 top-3 z-30 w-[min(320px,calc(100vw-1.5rem))] rounded-2xl border border-white/10 bg-slate-950/40 p-3 backdrop-blur-xl'>
				<h2 className='mb-2 text-sm font-semibold text-slate-100'>Text Overlay</h2>
				<input
					type='text'
					value={overlayText}
					onChange={(event) => setOverlayText(event.target.value)}
					placeholder='Nhập chữ muốn hiển thị...'
					className='w-full rounded-lg border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50'
				/>
				<div className='mt-2 flex items-center gap-2'>
					<input type='color' value={overlayTextColor} onChange={(event) => setOverlayTextColor(event.target.value)} className='h-8 w-10 rounded border border-white/20 bg-transparent p-0' />
					<input type='range' min={18} max={120} value={overlayTextSize} onChange={(event) => setOverlayTextSize(Number(event.target.value))} className='w-full'/>
					<span className='w-10 text-right text-xs text-slate-300'>{overlayTextSize}px</span>
				</div>
			</div>

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
