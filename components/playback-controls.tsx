"use client";

import { BarChart3, Circle, Pause, Play, SlidersHorizontal, Volume2, Waves } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { SpectrumColorScheme, SpectrumSettings, VisualizationMode } from "./visualization-canvas";

interface PlaybackControlsProps {
	isPlaying: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	isLoading: boolean;
	mode: VisualizationMode;
	settings: SpectrumSettings;
	onSettingsChange: (next: SpectrumSettings) => void;
	onModeChange: (mode: VisualizationMode) => void;
	onPlay: () => void;
	onPause: () => void;
	onSeek: (time: number) => void;
	onVolumeChange: (volume: number) => void;
}

const MODES: { id: VisualizationMode; icon: ReactNode; label: string }[] = [
	{ id: "bars", icon: <BarChart3 size={16} />, label: "Bars" },
	{ id: "waveform", icon: <Waves size={16} />, label: "Waveform" },
	{ id: "circular", icon: <Circle size={16} />, label: "Circular" },
];

const SCHEMES: SpectrumColorScheme[] = ["sunset", "neon", "fire"];

export function PlaybackControls({ isPlaying, currentTime, duration, volume, isLoading, mode, settings, onSettingsChange, onModeChange, onPlay, onPause, onSeek, onVolumeChange }: PlaybackControlsProps) {
	const [showSettings, setShowSettings] = useState(false);
	const updateSettings = (next: Partial<SpectrumSettings>) => onSettingsChange({ ...settings, ...next });

	const formatTime = (value: number) => {
		if (!Number.isFinite(value)) return "0:00";
		const minutes = Math.floor(value / 60);
		const seconds = Math.floor(value % 60);
		return `${minutes}:${String(seconds).padStart(2, "0")}`;
	};

	return (
		<div className='fixed inset-x-3 bottom-3 z-30 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl md:inset-x-8'>
			<div className='mb-3'>
				<input type='range' min={0} max={duration || 0} step={0.01} value={Math.min(currentTime, duration || 0)} onChange={(event) => onSeek(Number(event.target.value))} className='h-1.5 w-full' aria-label='Seek' />
			</div>

			<div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
				<div className='flex items-center gap-3'>
					<button onClick={isPlaying ? onPause : onPlay} disabled={isLoading} className='rounded-full bg-orange-500 p-3 text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50' aria-label={isPlaying ? "Pause" : "Play"}>
						{isPlaying ? <Pause size={20} fill='currentColor' /> : <Play size={20} fill='currentColor' />}
					</button>
					<span className='font-mono text-sm text-slate-100'>{formatTime(currentTime)} / {formatTime(duration)}</span>
				</div>

				<div className='flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-900/40 p-1'>
					{MODES.map((item) => (
						<button key={item.id} onClick={() => onModeChange(item.id)} className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition ${mode === item.id ? "bg-orange-500 text-white" : "text-slate-200 hover:bg-white/10"}`}>
							{item.icon}
							{item.label}
						</button>
					))}

					<button onClick={() => setShowSettings((prev) => !prev)} className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition ${showSettings ? "bg-cyan-500 text-white" : "text-slate-200 hover:bg-white/10"}`}>
						<SlidersHorizontal size={15} /> Tune
					</button>
				</div>

				<div className='flex items-center gap-2 md:w-44'>
					<Volume2 size={18} className='text-slate-100' />
					<input type='range' min={0} max={1} step={0.01} value={volume} onChange={(event) => onVolumeChange(Number(event.target.value))} className='h-1.5 w-full' aria-label='Volume' />
				</div>
			</div>

			{showSettings && (
				<div className='mt-3 grid gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-xs text-slate-200 md:grid-cols-2 lg:grid-cols-4'>
					<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
						<span>Start Frequency: {settings.startFrequency} Hz</span>
						<input type='range' min={0} max={20000} step={10} value={settings.startFrequency} onChange={(event) => updateSettings({ startFrequency: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
						<span>End Frequency: {settings.endFrequency} Hz</span>
						<input type='range' min={100} max={22000} step={10} value={settings.endFrequency} onChange={(event) => updateSettings({ endFrequency: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
						<span>Frequency bands: {settings.frequencyBands}</span>
						<input type='range' min={16} max={1000} step={1} value={settings.frequencyBands} onChange={(event) => updateSettings({ frequencyBands: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
						<span>Maximum Height: {Math.round(settings.maxHeight)}</span>
						<input type='range' min={1} max={1000} step={1} value={settings.maxHeight} onChange={(event) => updateSettings({ maxHeight: Number(event.target.value) })} />
					</label>

					<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
						<span>Audio Duration (ms): {settings.audioDurationMs || 0}</span>
						<input type='range' min={0} max={1200} step={1} value={settings.audioDurationMs} onChange={(event) => updateSettings({ audioDurationMs: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
						<span>Audio Offset (ms): {settings.audioOffsetMs}</span>
						<input type='range' min={0} max={500} step={1} value={settings.audioOffsetMs} onChange={(event) => updateSettings({ audioOffsetMs: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
						<span>Thickness: {settings.thickness.toFixed(1)}</span>
						<input type='range' min={1} max={14} step={0.5} value={settings.thickness} onChange={(event) => updateSettings({ thickness: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
						<span>Softness: {settings.softness.toFixed(2)}</span>
						<input type='range' min={0} max={1} step={0.01} value={settings.softness} onChange={(event) => updateSettings({ softness: Number(event.target.value) })} />
					</label>

					<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
						<span>Fall Speed: {settings.fallSpeed.toFixed(1)}</span>
						<input type='range' min={0.2} max={12} step={0.1} value={settings.fallSpeed} onChange={(event) => updateSettings({ fallSpeed: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
						<span>Rotation: {settings.rotationSpeed.toFixed(2)}x</span>
						<input type='range' min={-4} max={4} step={0.02} value={settings.rotationSpeed} onChange={(event) => updateSettings({ rotationSpeed: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
						<span>Sensitivity: {settings.sensitivity.toFixed(2)}</span>
						<input type='range' min={0.6} max={2} step={0.05} value={settings.sensitivity} onChange={(event) => updateSettings({ sensitivity: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
						<span>Radial boost: {settings.radialBoost.toFixed(2)}</span>
						<input type='range' min={0} max={1.5} step={0.05} value={settings.radialBoost} onChange={(event) => updateSettings({ radialBoost: Number(event.target.value) })} />
					</label>

					<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
						<span>Glow: {settings.glow.toFixed(1)}</span>
						<input type='range' min={0} max={40} step={0.05} value={settings.glow} onChange={(event) => updateSettings({ glow: Number(event.target.value) })} />
					</label>
					<label className='flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/40 p-2'>
						<span>Mirror</span>
						<input type='checkbox' checked={settings.mirror} onChange={(event) => updateSettings({ mirror: event.target.checked })} />
					</label>
					<label className='flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/40 p-2'>
						<span>Small blocks</span>
						<input type='checkbox' checked={settings.segmented} onChange={(event) => updateSettings({ segmented: event.target.checked })} />
					</label>
					<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
						<span>Color scheme</span>
						<select className='w-full rounded-md border border-white/10 bg-slate-900/70 p-1' value={settings.colorScheme} onChange={(event) => updateSettings({ colorScheme: event.target.value as SpectrumColorScheme })}>
							{SCHEMES.map((scheme) => (
								<option key={scheme} value={scheme}>{scheme}</option>
							))}
						</select>
					</label>

					<label className='space-y-1 rounded-lg border border-cyan-400/40 bg-slate-900/40 p-2 md:col-span-2'>
						<span>Overlay Text</span>
						<input type='text' value={settings.overlayText} placeholder='Nhập chữ muốn hiển thị...' onChange={(event) => updateSettings({ overlayText: event.target.value })} className='w-full rounded-md border border-white/10 bg-slate-900/70 p-1.5 text-slate-100' />
					</label>
					<label className='space-y-1 rounded-lg border border-cyan-400/40 bg-slate-900/40 p-2'>
						<span>Text Size: {Math.round(settings.overlayTextSize)} px</span>
						<input type='range' min={16} max={220} step={1} value={settings.overlayTextSize} onChange={(event) => updateSettings({ overlayTextSize: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-cyan-400/40 bg-slate-900/40 p-2'>
						<span>Text Opacity: {settings.overlayTextOpacity.toFixed(2)}</span>
						<input type='range' min={0} max={1} step={0.01} value={settings.overlayTextOpacity} onChange={(event) => updateSettings({ overlayTextOpacity: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-cyan-400/40 bg-slate-900/40 p-2'>
						<span>Text Position X: {Math.round(settings.textPositionX)} px</span>
						<input type='range' min={0} max={1920} step={1} value={settings.textPositionX} onChange={(event) => updateSettings({ textPositionX: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-cyan-400/40 bg-slate-900/40 p-2'>
						<span>Text Position Y: {Math.round(settings.textPositionY)} px</span>
						<input type='range' min={0} max={1080} step={1} value={settings.textPositionY} onChange={(event) => updateSettings({ textPositionY: Number(event.target.value) })} />
					</label>

					<label className='space-y-1 rounded-lg border border-cyan-400/40 bg-slate-900/40 p-2'>
						<span>Text react range min: {settings.textReactMinFrequency} Hz</span>
						<input type='range' min={0} max={20000} step={10} value={settings.textReactMinFrequency} onChange={(event) => updateSettings({ textReactMinFrequency: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-cyan-400/40 bg-slate-900/40 p-2'>
						<span>Text react range max: {settings.textReactMaxFrequency} Hz</span>
						<input type='range' min={20} max={22000} step={10} value={settings.textReactMaxFrequency} onChange={(event) => updateSettings({ textReactMaxFrequency: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-cyan-400/40 bg-slate-900/40 p-2'>
						<span>Text React Strength: {settings.textReactStrength.toFixed(2)}</span>
						<input type='range' min={0} max={4} step={0.05} value={settings.textReactStrength} onChange={(event) => updateSettings({ textReactStrength: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-cyan-400/40 bg-slate-900/40 p-2'>
						<span>Text Base Scale: {settings.textBaseScale.toFixed(2)}</span>
						<input type='range' min={0.4} max={2.2} step={0.01} value={settings.textBaseScale} onChange={(event) => updateSettings({ textBaseScale: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-cyan-400/40 bg-slate-900/40 p-2'>
						<span>Text Scale React: {settings.textScaleReactAmount.toFixed(2)}</span>
						<input type='range' min={0} max={2} step={0.01} value={settings.textScaleReactAmount} onChange={(event) => updateSettings({ textScaleReactAmount: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-cyan-400/40 bg-slate-900/40 p-2'>
						<span>Text Base Blur: {settings.textBaseBlur.toFixed(2)} px</span>
						<input type='range' min={0} max={20} step={0.1} value={settings.textBaseBlur} onChange={(event) => updateSettings({ textBaseBlur: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-cyan-400/40 bg-slate-900/40 p-2'>
						<span>Text Blur React: {settings.textBlurReactAmount.toFixed(2)} px</span>
						<input type='range' min={0} max={30} step={0.1} value={settings.textBlurReactAmount} onChange={(event) => updateSettings({ textBlurReactAmount: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-cyan-400/40 bg-slate-900/40 p-2'>
						<span>Text Wiggle: {settings.textWiggleAmount.toFixed(2)}</span>
						<input type='range' min={0} max={2} step={0.01} value={settings.textWiggleAmount} onChange={(event) => updateSettings({ textWiggleAmount: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-cyan-400/40 bg-slate-900/40 p-2'>
						<span>Text Wiggle Speed: {settings.textWiggleSpeed.toFixed(2)}</span>
						<input type='range' min={0} max={20} step={0.05} value={settings.textWiggleSpeed} onChange={(event) => updateSettings({ textWiggleSpeed: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-cyan-400/40 bg-slate-900/40 p-2'>
						<span>Text React Offset X: {settings.textReactOffsetX.toFixed(1)} px</span>
						<input type='range' min={-200} max={200} step={1} value={settings.textReactOffsetX} onChange={(event) => updateSettings({ textReactOffsetX: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-cyan-400/40 bg-slate-900/40 p-2'>
						<span>Text React Offset Y: {settings.textReactOffsetY.toFixed(1)} px</span>
						<input type='range' min={-200} max={200} step={1} value={settings.textReactOffsetY} onChange={(event) => updateSettings({ textReactOffsetY: Number(event.target.value) })} />
					</label>

					<label className='space-y-1 rounded-lg border border-fuchsia-400/40 bg-slate-900/40 p-2'>
						<span>Background react range min: {settings.backgroundReactMinFrequency} Hz</span>
						<input type='range' min={0} max={20000} step={10} value={settings.backgroundReactMinFrequency} onChange={(event) => updateSettings({ backgroundReactMinFrequency: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-fuchsia-400/40 bg-slate-900/40 p-2'>
						<span>Background react range max: {settings.backgroundReactMaxFrequency} Hz</span>
						<input type='range' min={20} max={22000} step={10} value={settings.backgroundReactMaxFrequency} onChange={(event) => updateSettings({ backgroundReactMaxFrequency: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-fuchsia-400/40 bg-slate-900/40 p-2'>
						<span>Background React Strength: {settings.backgroundReactStrength.toFixed(2)}</span>
						<input type='range' min={0} max={4} step={0.05} value={settings.backgroundReactStrength} onChange={(event) => updateSettings({ backgroundReactStrength: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-fuchsia-400/40 bg-slate-900/40 p-2'>
						<span>Background Base Scale: {settings.backgroundBaseScale.toFixed(2)}</span>
						<input type='range' min={0.7} max={1.8} step={0.01} value={settings.backgroundBaseScale} onChange={(event) => updateSettings({ backgroundBaseScale: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-fuchsia-400/40 bg-slate-900/40 p-2'>
						<span>Background Scale React: {settings.backgroundScaleReactAmount.toFixed(2)}</span>
						<input type='range' min={0} max={1} step={0.01} value={settings.backgroundScaleReactAmount} onChange={(event) => updateSettings({ backgroundScaleReactAmount: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-fuchsia-400/40 bg-slate-900/40 p-2'>
						<span>Background Base Blur: {settings.backgroundBaseBlur.toFixed(2)} px</span>
						<input type='range' min={0} max={20} step={0.1} value={settings.backgroundBaseBlur} onChange={(event) => updateSettings({ backgroundBaseBlur: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-fuchsia-400/40 bg-slate-900/40 p-2'>
						<span>Background Blur React: {settings.backgroundBlurReactAmount.toFixed(2)} px</span>
						<input type='range' min={0} max={24} step={0.1} value={settings.backgroundBlurReactAmount} onChange={(event) => updateSettings({ backgroundBlurReactAmount: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-fuchsia-400/40 bg-slate-900/40 p-2'>
						<span>Background Glow: {settings.backgroundGlowStrength.toFixed(2)}</span>
						<input type='range' min={0} max={4} step={0.05} value={settings.backgroundGlowStrength} onChange={(event) => updateSettings({ backgroundGlowStrength: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-fuchsia-400/40 bg-slate-900/40 p-2'>
						<span>Background Wiggle: {settings.backgroundWiggleAmount.toFixed(2)}</span>
						<input type='range' min={0} max={2} step={0.01} value={settings.backgroundWiggleAmount} onChange={(event) => updateSettings({ backgroundWiggleAmount: Number(event.target.value) })} />
					</label>
					<label className='space-y-1 rounded-lg border border-fuchsia-400/40 bg-slate-900/40 p-2'>
						<span>Background Wiggle Speed: {settings.backgroundWiggleSpeed.toFixed(2)}</span>
						<input type='range' min={0} max={20} step={0.05} value={settings.backgroundWiggleSpeed} onChange={(event) => updateSettings({ backgroundWiggleSpeed: Number(event.target.value) })} />
					</label>
				</div>
			)}
		</div>
	);
}
