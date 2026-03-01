"use client";

import { BarChart3, Circle, Pause, Play, SlidersHorizontal, Volume2, Waves, WavesLadder } from "lucide-react";
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
	{ id: "liquid", icon: <Waves size={16} />, label: "Liquid Reflection" },
	{ id: "dual-wave", icon: <WavesLadder size={16} />, label: "Dual Wave" },
];

const SCHEMES: SpectrumColorScheme[] = ["sunset", "neon", "fire"];
const EXTENSION_SAMPLES = {
	spectrum: `// 🌈 Cyber Neon Spectrum — reactive glow bars
const ctx = context.ctx;
const bars = 48;
const baseY = context.height * 0.82;
const barW = context.width / bars;

ctx.save();
ctx.globalCompositeOperation = "lighter";

for (let i = 0; i < bars; i++) {
	const index = Math.floor((i / bars) * context.frequencyData.length);
	const energy = (context.frequencyData[index] || 0) / 255;
	const h = energy * context.height * 0.35;

	const x = i * barW;
	const y = baseY - h;

	const hue = 200 + energy * 120;

	const grad = ctx.createLinearGradient(0, y, 0, baseY);
	grad.addColorStop(0, \`hsla(\${hue},100%,65%,0.95)\`);
	grad.addColorStop(1, \`hsla(\${hue + 40},100%,55%,0.15)\`);

	ctx.shadowColor = \`hsla(\${hue},100%,70%,0.8)\`;

	ctx.fillStyle = grad;
	ctx.fillRect(x + 2, y, barW - 4, h);
}

ctx.restore();`,

	background: `// 🌌 Reactive Neon Pulse Background
const ctx = context.ctx;
const cx = context.width / 2;
const cy = context.height / 2;

const bass = context.bassIntensity;
const pulse = 0.15 + bass * 0.6;
const radius = Math.min(context.width, context.height) * (0.25 + bass * 0.25);

const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
grad.addColorStop(0, \`rgba(56,189,248,\${pulse})\`);
grad.addColorStop(0.5, \`rgba(168,85,247,\${pulse * 0.4})\`);
grad.addColorStop(1, "rgba(0,0,0,0)");

ctx.save();
ctx.globalCompositeOperation = "lighter";
ctx.fillStyle = grad;
ctx.fillRect(0, 0, context.width, context.height);
ctx.restore();

// subtle vignette
ctx.save();
const vg = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius * 1.3);
vg.addColorStop(0, "rgba(0,0,0,0)");
vg.addColorStop(1, "rgba(0,0,0,0.55)");
ctx.fillStyle = vg;
ctx.fillRect(0, 0, context.width, context.height);
ctx.restore();`,

	text: `// ✨ Floating HUD Text + glow beat meter
const ctx = context.ctx;
const t = Date.now() * 0.002;
const beat = context.bassIntensity;

const y = context.height - 500 + Math.sin(t) * 6;

ctx.save();
ctx.textAlign = "center";
ctx.font = "700 28px Inter, system-ui, sans-serif";

ctx.shadowColor = "rgba(56,189,248,0.9)";
ctx.shadowBlur = 18 + beat * 40;

const grad = ctx.createLinearGradient(
	context.width / 2 - 120,
	y,
	context.width / 2 + 120,
	y,
);
grad.addColorStop(0, "#38bdf8");
grad.addColorStop(0.5, "#a855f7");
grad.addColorStop(1, "#f472b6");

ctx.fillStyle = grad;
ctx.fillText(
	\`BASS POWER • \${Math.round(beat * 100)}%\`,
	context.width / 2,
	y,
);

ctx.restore();`,
} as const;

type SettingsTab = "audio" | "background" | "text" | "extension";

export function PlaybackControls({ isPlaying, currentTime, duration, volume, isLoading, mode, settings, onSettingsChange, onModeChange, onPlay, onPause, onSeek, onVolumeChange }: PlaybackControlsProps) {
	const [showSettings, setShowSettings] = useState(false);
	const [activeTab, setActiveTab] = useState<SettingsTab>("audio");

	const formatTime = (value: number) => {
		if (!Number.isFinite(value)) return "0:00";
		const minutes = Math.floor(value / 60);
		const seconds = Math.floor(value % 60);
		return `${minutes}:${String(seconds).padStart(2, "0")}`;
	};

	const tabButtonClass = (tab: SettingsTab) => `rounded-lg px-3 py-1.5 text-xs transition ${activeTab === tab ? "bg-cyan-500 text-white" : "text-slate-200 hover:bg-white/10"}`;

	return (
		<div className='fixed inset-x-3 bottom-3 z-30 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl md:inset-x-8'>
			<div className='mb-3'>
				<input
					type='range'
					min={0}
					max={duration || 0}
					step={0.01}
					value={Math.min(currentTime, duration || 0)}
					onChange={(event) => onSeek(Number(event.target.value))}
					className='h-1.5 w-full'
					aria-label='Seek'
				/>
			</div>

			<div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
				<div className='flex items-center gap-3'>
					<button
						onClick={isPlaying ? onPause : onPlay}
						disabled={isLoading}
						className='rounded-full bg-orange-500 p-3 text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50'
						aria-label={isPlaying ? "Pause" : "Play"}>
						{isPlaying ?
							<Pause
								size={20}
								fill='currentColor'
							/>
						:	<Play
								size={20}
								fill='currentColor'
							/>
						}
					</button>

					<span className='font-mono text-sm text-slate-100'>
						{formatTime(currentTime)} / {formatTime(duration)}
					</span>
				</div>

				<div className='flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-900/40 p-1'>
					{MODES.map((item) => (
						<button
							key={item.id}
							onClick={() => onModeChange(item.id)}
							className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition ${mode === item.id ? "bg-orange-500 text-white" : "text-slate-200 hover:bg-white/10"}`}>
							{item.icon}
							{item.label}
						</button>
					))}

					<button
						onClick={() => setShowSettings((prev) => !prev)}
						className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition ${showSettings ? "bg-cyan-500 text-white" : "text-slate-200 hover:bg-white/10"}`}>
						<SlidersHorizontal size={15} /> Tune
					</button>
				</div>

				<div className='flex items-center gap-2 md:w-44'>
					<Volume2
						size={18}
						className='text-slate-100'
					/>
					<input
						type='range'
						min={0}
						max={1}
						step={0.01}
						value={volume}
						onChange={(event) => onVolumeChange(Number(event.target.value))}
						className='h-1.5 w-full'
						aria-label='Volume'
					/>
				</div>
			</div>

			{showSettings && (
				<div className='mt-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-xs text-slate-200'>
					<div className='mb-3 flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-slate-900/40 p-1'>
						<button
							onClick={() => setActiveTab("audio")}
							className={tabButtonClass("audio")}>
							Audio
						</button>
						<button
							onClick={() => setActiveTab("background")}
							className={tabButtonClass("background")}>
							Background
						</button>
						<button
							onClick={() => setActiveTab("text")}
							className={tabButtonClass("text")}>
							Text / Logo
						</button>
						<button
							onClick={() => setActiveTab("extension")}
							className={tabButtonClass("extension")}>
							Extension
						</button>
					</div>

					{activeTab === "audio" && (
						<div className='grid gap-3 md:grid-cols-2 lg:grid-cols-4'>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
								<span>Start Frequency: {settings.startFrequency} Hz</span>
								<input
									type='range'
									min={0}
									max={20000}
									step={10}
									value={settings.startFrequency}
									onChange={(event) => onSettingsChange({ ...settings, startFrequency: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
								<span>End Frequency: {settings.endFrequency} Hz</span>
								<input
									type='range'
									min={100}
									max={22000}
									step={10}
									value={settings.endFrequency}
									onChange={(event) => onSettingsChange({ ...settings, endFrequency: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
								<span>Frequency bands: {settings.frequencyBands}</span>
								<input
									type='range'
									min={16}
									max={1000}
									step={1}
									value={settings.frequencyBands}
									onChange={(event) => onSettingsChange({ ...settings, frequencyBands: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
								<span>Maximum Height: {Math.round(settings.maxHeight)}</span>
								<input
									type='range'
									min={1}
									max={1000}
									step={1}
									value={settings.maxHeight}
									onChange={(event) => onSettingsChange({ ...settings, maxHeight: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
								<span>Audio Duration (milliseconds): {settings.audioDurationMs || 0}</span>
								<input
									type='range'
									min={0}
									max={1200}
									step={1}
									value={settings.audioDurationMs}
									onChange={(event) => onSettingsChange({ ...settings, audioDurationMs: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
								<span>Audio Offset (milliseconds): {settings.audioOffsetMs}</span>
								<input
									type='range'
									min={0}
									max={500}
									step={1}
									value={settings.audioOffsetMs}
									onChange={(event) => onSettingsChange({ ...settings, audioOffsetMs: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
								<span>Thickness: {settings.thickness.toFixed(1)}</span>
								<input
									type='range'
									min={1}
									max={14}
									step={0.5}
									value={settings.thickness}
									onChange={(event) => onSettingsChange({ ...settings, thickness: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
								<span>Softness: {settings.softness.toFixed(2)}</span>
								<input
									type='range'
									min={0}
									max={1}
									step={0.01}
									value={settings.softness}
									onChange={(event) => onSettingsChange({ ...settings, softness: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
								<span>Fall Speed: {settings.fallSpeed.toFixed(1)}</span>
								<input
									type='range'
									min={0.2}
									max={12}
									step={0.1}
									value={settings.fallSpeed}
									onChange={(event) => onSettingsChange({ ...settings, fallSpeed: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
								<span>Rotation: {settings.rotationSpeed.toFixed(2)}x</span>
								<input
									type='range'
									min={-4}
									max={4}
									step={0.02}
									value={settings.rotationSpeed}
									onChange={(event) => onSettingsChange({ ...settings, rotationSpeed: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
								<span>Sensitivity: {settings.sensitivity.toFixed(2)}</span>
								<input
									type='range'
									min={0.6}
									max={2}
									step={0.05}
									value={settings.sensitivity}
									onChange={(event) => onSettingsChange({ ...settings, sensitivity: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
								<span>Radial boost: {settings.radialBoost.toFixed(2)}</span>
								<input
									type='range'
									min={0}
									max={1.5}
									step={0.05}
									value={settings.radialBoost}
									onChange={(event) => onSettingsChange({ ...settings, radialBoost: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
								<span>Glow: {settings.glow.toFixed(1)}</span>
								<input
									type='range'
									min={0}
									max={40}
									step={0.05}
									value={settings.glow}
									onChange={(event) => onSettingsChange({ ...settings, glow: Number(event.target.value) })}
								/>
							</label>
							<label className='flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/40 p-2'>
								<span>Mirror</span>
								<input
									type='checkbox'
									checked={settings.mirror}
									onChange={(event) => onSettingsChange({ ...settings, mirror: event.target.checked })}
									className='h-4 w-4 accent-emerald-400'
								/>
							</label>
							<label className='flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/40 p-2'>
								<span>Small blocks</span>
								<input
									type='checkbox'
									checked={settings.segmented}
									onChange={(event) => onSettingsChange({ ...settings, segmented: event.target.checked })}
									className='h-4 w-4 accent-emerald-400'
								/>
							</label>
							<label className='flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/40 p-2'>
								<span>Progress</span>
								<input
									type='checkbox'
									checked={settings.drawProgress}
									onChange={(event) => onSettingsChange({ ...settings, drawProgress: event.target.checked })}
									className='h-4 w-4 accent-emerald-400'
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'>
								<span>Color scheme</span>
								<select
									className='w-full rounded-md border border-white/10 bg-slate-900/70 p-1'
									value={settings.colorScheme}
									onChange={(event) => onSettingsChange({ ...settings, colorScheme: event.target.value as SpectrumColorScheme })}>
									{SCHEMES.map((scheme) => (
										<option
											key={scheme}
											value={scheme}>
											{scheme}
										</option>
									))}
								</select>
							</label>
						</div>
					)}

					{activeTab === "background" && (
						<div className='grid gap-3 md:grid-cols-2 lg:grid-cols-4'>
							<label className='space-y-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-2'>
								<span>Background Scale: {settings.backgroundScale.toFixed(2)}x</span>
								<input
									type='range'
									min={0.6}
									max={2}
									step={0.01}
									value={settings.backgroundScale}
									onChange={(event) => onSettingsChange({ ...settings, backgroundScale: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-2'>
								<span>Background Blur: {settings.backgroundBlur.toFixed(1)} px</span>
								<input
									type='range'
									min={0}
									max={20}
									step={0.1}
									value={settings.backgroundBlur}
									onChange={(event) => onSettingsChange({ ...settings, backgroundBlur: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-2'>
								<span>Background Wiggle: {settings.backgroundWiggle.toFixed(1)} px</span>
								<input
									type='range'
									min={0}
									max={120}
									step={0.5}
									value={settings.backgroundWiggle}
									onChange={(event) => onSettingsChange({ ...settings, backgroundWiggle: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-2'>
								<span>Background X: {Math.round(settings.backgroundX)} px</span>
								<input
									type='range'
									min={-960}
									max={960}
									step={1}
									value={settings.backgroundX}
									onChange={(event) => onSettingsChange({ ...settings, backgroundX: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-2'>
								<span>Background Y: {Math.round(settings.backgroundY)} px</span>
								<input
									type='range'
									min={-540}
									max={540}
									step={1}
									value={settings.backgroundY}
									onChange={(event) => onSettingsChange({ ...settings, backgroundY: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-2'>
								<span>Background React Strength: {settings.backgroundReactStrength.toFixed(2)}</span>
								<input
									type='range'
									min={0}
									max={2}
									step={0.01}
									value={settings.backgroundReactStrength}
									onChange={(event) => onSettingsChange({ ...settings, backgroundReactStrength: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-2'>
								<span>Background Glow: {settings.backgroundGlow.toFixed(2)}</span>
								<input
									type='range'
									min={0}
									max={2}
									step={0.01}
									value={settings.backgroundGlow}
									onChange={(event) => onSettingsChange({ ...settings, backgroundGlow: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-2'>
								<span>Background React Min: {settings.backgroundReactMinHz} Hz</span>
								<input
									type='range'
									min={0}
									max={20000}
									step={10}
									value={settings.backgroundReactMinHz}
									onChange={(event) => onSettingsChange({ ...settings, backgroundReactMinHz: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-2'>
								<span>Background React Max: {settings.backgroundReactMaxHz} Hz</span>
								<input
									type='range'
									min={20}
									max={22000}
									step={10}
									value={settings.backgroundReactMaxHz}
									onChange={(event) => onSettingsChange({ ...settings, backgroundReactMaxHz: Number(event.target.value) })}
								/>
							</label>
						</div>
					)}

					{activeTab === "text" && (
						<div className='grid gap-3 md:grid-cols-2 lg:grid-cols-4'>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2 md:col-span-2'>
								<span>Overlay Type</span>
								<select
									className='w-full rounded-md border border-white/10 bg-slate-900/70 p-1.5'
									value={settings.overlayMode}
									onChange={(event) => onSettingsChange({ ...settings, overlayMode: event.target.value as SpectrumSettings["overlayMode"] })}>
									<option value='text'>Text</option>
									<option value='logo'>Logo image</option>
								</select>
							</label>
							{settings.overlayMode === "text" && (
								<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2 md:col-span-2'>
									<span>Overlay Text</span>
									<input
										type='text'
										value={settings.overlayText}
										placeholder='Nhập chữ muốn hiển thị...'
										onChange={(event) => onSettingsChange({ ...settings, overlayText: event.target.value })}
										className='w-full rounded-md border border-white/10 bg-slate-900/70 p-1.5 text-slate-100'
									/>
								</label>
							)}
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'>
								<span>Size: {Math.round(settings.overlayTextSize)} px</span>
								<input
									type='range'
									min={16}
									max={260}
									step={1}
									value={settings.overlayTextSize}
									onChange={(event) => onSettingsChange({ ...settings, overlayTextSize: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'>
								<span>Opacity: {settings.overlayTextOpacity.toFixed(2)}</span>
								<input
									type='range'
									min={0}
									max={1}
									step={0.01}
									value={settings.overlayTextOpacity}
									onChange={(event) => onSettingsChange({ ...settings, overlayTextOpacity: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'>
								<span>X: {Math.round(settings.overlayTextX)} px</span>
								<input
									type='range'
									min={-960}
									max={960}
									step={1}
									value={settings.overlayTextX}
									onChange={(event) => onSettingsChange({ ...settings, overlayTextX: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'>
								<span>Y: {Math.round(settings.overlayTextY)} px</span>
								<input
									type='range'
									min={40}
									max={900}
									step={1}
									value={settings.overlayTextY}
									onChange={(event) => onSettingsChange({ ...settings, overlayTextY: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'>
								<span>Scale: {settings.overlayTextScale.toFixed(2)}x</span>
								<input
									type='range'
									min={0.3}
									max={3}
									step={0.01}
									value={settings.overlayTextScale}
									onChange={(event) => onSettingsChange({ ...settings, overlayTextScale: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'>
								<span>Blur: {settings.overlayTextBlur.toFixed(1)} px</span>
								<input
									type='range'
									min={0}
									max={20}
									step={0.1}
									value={settings.overlayTextBlur}
									onChange={(event) => onSettingsChange({ ...settings, overlayTextBlur: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'>
								<span>Wiggle: {settings.overlayTextWiggle.toFixed(1)} px</span>
								<input
									type='range'
									min={0}
									max={80}
									step={0.5}
									value={settings.overlayTextWiggle}
									onChange={(event) => onSettingsChange({ ...settings, overlayTextWiggle: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'>
								<span>React Strength: {settings.overlayTextReactStrength.toFixed(2)}</span>
								<input
									type='range'
									min={0}
									max={2}
									step={0.01}
									value={settings.overlayTextReactStrength}
									onChange={(event) => onSettingsChange({ ...settings, overlayTextReactStrength: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'>
								<span>React Glow: {settings.overlayTextReactGlow.toFixed(2)}</span>
								<input
									type='range'
									min={0}
									max={2}
									step={0.01}
									value={settings.overlayTextReactGlow}
									onChange={(event) => onSettingsChange({ ...settings, overlayTextReactGlow: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'>
								<span>React Min: {settings.overlayTextReactMinHz} Hz</span>
								<input
									type='range'
									min={0}
									max={20000}
									step={10}
									value={settings.overlayTextReactMinHz}
									onChange={(event) => onSettingsChange({ ...settings, overlayTextReactMinHz: Number(event.target.value) })}
								/>
							</label>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'>
								<span>React Max: {settings.overlayTextReactMaxHz} Hz</span>
								<input
									type='range'
									min={20}
									max={22000}
									step={10}
									value={settings.overlayTextReactMaxHz}
									onChange={(event) => onSettingsChange({ ...settings, overlayTextReactMaxHz: Number(event.target.value) })}
								/>
							</label>
						</div>
					)}

					{activeTab === "extension" && (
						<div className='space-y-4 rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 via-slate-950/40 to-cyan-500/10 p-4'>
							{/* Header */}
							<div className='flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/50 p-3'>
								<div>
									<p className='text-sm font-semibold tracking-wide text-emerald-300'>⚡ EXTENSION SYSTEM</p>
									<p className='text-[11px] text-slate-400'>Custom render pipeline – executed every frame</p>
								</div>

								<label className='flex items-center gap-3'>
									<span className='text-xs text-slate-300'>Enable</span>
									<input
										type='checkbox'
										checked={settings.extensionEnabled}
										onChange={(e) => onSettingsChange({ ...settings, extensionEnabled: e.target.checked })}
										className='h-4 w-4 accent-emerald-400'
									/>
								</label>
							</div>

							{/* Guide */}
							<div className='grid gap-3 rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-3 text-[11px] text-slate-300 md:grid-cols-3'>
								<div>
									<p className='mb-1 font-semibold text-cyan-300'>Context API</p>
									<ul className='space-y-0.5'>
										<li>
											<code>context.ctx</code> – Canvas 2D context
										</li>
										<li>
											<code>context.width / height</code>
										</li>
										<li>
											<code>context.frequencyData</code>
										</li>
										<li>
											<code>context.timeData</code>
										</li>
									</ul>
								</div>
								<div>
									<p className='mb-1 font-semibold text-cyan-300'>Audio React</p>
									<ul className='space-y-0.5'>
										<li>
											<code>context.bassIntensity</code>
										</li>
										<li>
											<code>context.backgroundReact</code>
										</li>
										<li>
											<code>context.textReact</code>
										</li>
									</ul>
								</div>
								<div>
									<p className='mb-1 font-semibold text-cyan-300'>Examples</p>
									<ul className='space-y-0.5'>
										<li>
											<a href='https://github.com/zijipia/web-audio-visualizer/discussions/categories/extensions'>View/Create Examples</a>
										</li>
									</ul>
								</div>
							</div>

							{/* Editors */}
							<div className='grid gap-3 lg:grid-cols-3'>
								{/* Spectrum */}
								<div className='group rounded-xl border border-cyan-400/20 bg-slate-900/60 p-2 transition hover:border-cyan-400/50'>
									<header className='mb-2 flex items-center justify-between'>
										<p className='text-xs font-semibold text-cyan-300'>Spectrum Layer</p>
										<button
											type='button'
											onClick={() =>
												onSettingsChange({
													...settings,
													extensionSpectrumCode: EXTENSION_SAMPLES.spectrum,
												})
											}
											className='rounded border border-cyan-400/30 px-2 py-0.5 text-[10px] text-cyan-200 hover:bg-cyan-400/10'>
											Load preset
										</button>
									</header>

									<textarea
										rows={12}
										spellCheck={false}
										value={settings.extensionSpectrumCode}
										placeholder='Write JS code. Use  context.frequencyData, context.timeData, context.bassIntensity. to keep current effect.'
										onChange={(e) =>
											onSettingsChange({
												...settings,
												extensionSpectrumCode: e.target.value,
											})
										}
										className='w-full rounded-lg border border-white/10 bg-black/60 p-2 font-mono text-[11px] text-cyan-200 outline-none focus:border-cyan-400/60'
									/>
								</div>

								{/* Background */}
								<div className='group rounded-xl border border-fuchsia-400/20 bg-slate-900/60 p-2 transition hover:border-fuchsia-400/50'>
									<header className='mb-2 flex items-center justify-between'>
										<p className='text-xs font-semibold text-fuchsia-300'>Background Layer</p>
										<button
											type='button'
											onClick={() =>
												onSettingsChange({
													...settings,
													extensionBackgroundCode: EXTENSION_SAMPLES.background,
												})
											}
											className='rounded border border-fuchsia-400/30 px-2 py-0.5 text-[10px] text-fuchsia-200 hover:bg-fuchsia-400/10'>
											Load preset
										</button>
									</header>

									<textarea
										rows={12}
										spellCheck={false}
										value={settings.extensionBackgroundCode}
										placeholder='Write JS code. Use  context.frequencyData, context.timeData, context.bassIntensity. to keep current effect.'
										onChange={(e) =>
											onSettingsChange({
												...settings,
												extensionBackgroundCode: e.target.value,
											})
										}
										className='w-full rounded-lg border border-white/10 bg-black/60 p-2 font-mono text-[11px] text-fuchsia-200 outline-none focus:border-fuchsia-400/60'
									/>
								</div>

								{/* Text */}
								<div className='group rounded-xl border border-amber-400/20 bg-slate-900/60 p-2 transition hover:border-amber-400/50'>
									<header className='mb-2 flex items-center justify-between'>
										<p className='text-xs font-semibold text-amber-300'>Text Layer</p>
										<button
											type='button'
											onClick={() =>
												onSettingsChange({
													...settings,
													extensionTextCode: EXTENSION_SAMPLES.text,
												})
											}
											className='rounded border border-amber-400/30 px-2 py-0.5 text-[10px] text-amber-200 hover:bg-amber-400/10'>
											Load preset
										</button>
									</header>

									<textarea
										rows={12}
										spellCheck={false}
										value={settings.extensionTextCode}
										placeholder='Write JS code. Use  context.frequencyData, context.timeData, context.bassIntensity. to keep current effect.'
										onChange={(e) =>
											onSettingsChange({
												...settings,
												extensionTextCode: e.target.value,
											})
										}
										className='w-full rounded-lg border border-white/10 bg-black/60 p-2 font-mono text-[11px] text-amber-200 outline-none focus:border-amber-400/60'
									/>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
