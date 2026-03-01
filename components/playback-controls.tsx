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
const EXTENSION_SAMPLES = {
	spectrum: `// Vẽ thêm lớp spectrum tuỳ chỉnh sau spectrum mặc định
const bars = 24;
const baseY = context.height * 0.78;
const width = context.width / bars;
context.ctx.save();
for (let i = 0; i < bars; i += 1) {
	const index = Math.floor((i / bars) * context.frequencyData.length);
	const energy = (context.frequencyData[index] ?? 0) / 255;
	const h = energy * 180;
	context.ctx.fillStyle = \`rgba(56, 189, 248, \${0.2 + energy * 0.8})\`;
	context.ctx.fillRect(i * width + 2, baseY - h, width - 4, h);
}
context.ctx.restore();`,
	background: `// Vẽ background layer phía sau spectrum
const pulse = 0.15 + context.backgroundReact * 0.35;
const radius = Math.min(context.width, context.height) * (0.2 + context.bassIntensity * 0.15);
const gradient = context.ctx.createRadialGradient(
	context.width / 2,
	context.height / 2,
	0,
	context.width / 2,
	context.height / 2,
	radius,
);
gradient.addColorStop(0, \`rgba(236, 72, 153, \${pulse})\`);
gradient.addColorStop(1, "rgba(236, 72, 153, 0)");
context.ctx.save();
context.ctx.fillStyle = gradient;
context.ctx.fillRect(0, 0, context.width, context.height);
context.ctx.restore();`,
	text: `// Vẽ text layer bổ sung sau text/logo mặc định
context.ctx.save();
context.ctx.font = "600 26px Inter, sans-serif";
context.ctx.textAlign = "center";
context.ctx.fillStyle = \`rgba(255, 255, 255, \${0.5 + context.textReact * 0.5})\`;
context.ctx.fillText(\`Beat: \${Math.round(context.bassIntensity * 100)}%\`, context.width / 2, context.height - 44);
context.ctx.restore();`,
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

	const tabButtonClass = (tab: SettingsTab) =>
		`rounded-lg px-3 py-1.5 text-xs transition ${activeTab === tab ? "bg-cyan-500 text-white" : "text-slate-200 hover:bg-white/10"}`;

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

					<span className='font-mono text-sm text-slate-100'>
						{formatTime(currentTime)} / {formatTime(duration)}
					</span>
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
				<div className='mt-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-xs text-slate-200'>
					<div className='mb-3 flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-slate-900/40 p-1'>
						<button onClick={() => setActiveTab("audio")} className={tabButtonClass("audio")}>Audio</button>
						<button onClick={() => setActiveTab("background")} className={tabButtonClass("background")}>Background</button>
						<button onClick={() => setActiveTab("text")} className={tabButtonClass("text")}>Text / Logo</button>
						<button onClick={() => setActiveTab("extension")} className={tabButtonClass("extension")}>Extension</button>
					</div>

					{activeTab === "audio" && (
						<div className='grid gap-3 md:grid-cols-2 lg:grid-cols-4'>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'><span>Start Frequency: {settings.startFrequency} Hz</span><input type='range' min={0} max={20000} step={10} value={settings.startFrequency} onChange={(event) => onSettingsChange({ ...settings, startFrequency: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'><span>End Frequency: {settings.endFrequency} Hz</span><input type='range' min={100} max={22000} step={10} value={settings.endFrequency} onChange={(event) => onSettingsChange({ ...settings, endFrequency: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'><span>Frequency bands: {settings.frequencyBands}</span><input type='range' min={16} max={1000} step={1} value={settings.frequencyBands} onChange={(event) => onSettingsChange({ ...settings, frequencyBands: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'><span>Maximum Height: {Math.round(settings.maxHeight)}</span><input type='range' min={1} max={1000} step={1} value={settings.maxHeight} onChange={(event) => onSettingsChange({ ...settings, maxHeight: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'><span>Audio Duration (milliseconds): {settings.audioDurationMs || 0}</span><input type='range' min={0} max={1200} step={1} value={settings.audioDurationMs} onChange={(event) => onSettingsChange({ ...settings, audioDurationMs: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'><span>Audio Offset (milliseconds): {settings.audioOffsetMs}</span><input type='range' min={0} max={500} step={1} value={settings.audioOffsetMs} onChange={(event) => onSettingsChange({ ...settings, audioOffsetMs: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'><span>Thickness: {settings.thickness.toFixed(1)}</span><input type='range' min={1} max={14} step={0.5} value={settings.thickness} onChange={(event) => onSettingsChange({ ...settings, thickness: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'><span>Softness: {settings.softness.toFixed(2)}</span><input type='range' min={0} max={1} step={0.01} value={settings.softness} onChange={(event) => onSettingsChange({ ...settings, softness: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'><span>Fall Speed: {settings.fallSpeed.toFixed(1)}</span><input type='range' min={0.2} max={12} step={0.1} value={settings.fallSpeed} onChange={(event) => onSettingsChange({ ...settings, fallSpeed: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'><span>Rotation: {settings.rotationSpeed.toFixed(2)}x</span><input type='range' min={-4} max={4} step={0.02} value={settings.rotationSpeed} onChange={(event) => onSettingsChange({ ...settings, rotationSpeed: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'><span>Sensitivity: {settings.sensitivity.toFixed(2)}</span><input type='range' min={0.6} max={2} step={0.05} value={settings.sensitivity} onChange={(event) => onSettingsChange({ ...settings, sensitivity: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'><span>Radial boost: {settings.radialBoost.toFixed(2)}</span><input type='range' min={0} max={1.5} step={0.05} value={settings.radialBoost} onChange={(event) => onSettingsChange({ ...settings, radialBoost: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'><span>Glow: {settings.glow.toFixed(1)}</span><input type='range' min={0} max={40} step={0.05} value={settings.glow} onChange={(event) => onSettingsChange({ ...settings, glow: Number(event.target.value) })} /></label>
							<label className='flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/40 p-2'><span>Mirror</span><input type='checkbox' checked={settings.mirror} onChange={(event) => onSettingsChange({ ...settings, mirror: event.target.checked })} /></label>
							<label className='flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/40 p-2'><span>Small blocks</span><input type='checkbox' checked={settings.segmented} onChange={(event) => onSettingsChange({ ...settings, segmented: event.target.checked })} /></label>
							<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/40 p-2'><span>Color scheme</span><select className='w-full rounded-md border border-white/10 bg-slate-900/70 p-1' value={settings.colorScheme} onChange={(event) => onSettingsChange({ ...settings, colorScheme: event.target.value as SpectrumColorScheme })}>{SCHEMES.map((scheme) => <option key={scheme} value={scheme}>{scheme}</option>)}</select></label>
						</div>
					)}

					{activeTab === "background" && (
						<div className='grid gap-3 md:grid-cols-2 lg:grid-cols-4'>
							<label className='space-y-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-2'><span>Background Scale: {settings.backgroundScale.toFixed(2)}x</span><input type='range' min={0.6} max={2} step={0.01} value={settings.backgroundScale} onChange={(event) => onSettingsChange({ ...settings, backgroundScale: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-2'><span>Background Blur: {settings.backgroundBlur.toFixed(1)} px</span><input type='range' min={0} max={20} step={0.1} value={settings.backgroundBlur} onChange={(event) => onSettingsChange({ ...settings, backgroundBlur: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-2'><span>Background Wiggle: {settings.backgroundWiggle.toFixed(1)} px</span><input type='range' min={0} max={120} step={0.5} value={settings.backgroundWiggle} onChange={(event) => onSettingsChange({ ...settings, backgroundWiggle: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-2'><span>Background X: {Math.round(settings.backgroundX)} px</span><input type='range' min={-960} max={960} step={1} value={settings.backgroundX} onChange={(event) => onSettingsChange({ ...settings, backgroundX: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-2'><span>Background Y: {Math.round(settings.backgroundY)} px</span><input type='range' min={-540} max={540} step={1} value={settings.backgroundY} onChange={(event) => onSettingsChange({ ...settings, backgroundY: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-2'><span>Background React Strength: {settings.backgroundReactStrength.toFixed(2)}</span><input type='range' min={0} max={2} step={0.01} value={settings.backgroundReactStrength} onChange={(event) => onSettingsChange({ ...settings, backgroundReactStrength: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-2'><span>Background Glow: {settings.backgroundGlow.toFixed(2)}</span><input type='range' min={0} max={2} step={0.01} value={settings.backgroundGlow} onChange={(event) => onSettingsChange({ ...settings, backgroundGlow: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-2'><span>Background React Min: {settings.backgroundReactMinHz} Hz</span><input type='range' min={0} max={20000} step={10} value={settings.backgroundReactMinHz} onChange={(event) => onSettingsChange({ ...settings, backgroundReactMinHz: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-2'><span>Background React Max: {settings.backgroundReactMaxHz} Hz</span><input type='range' min={20} max={22000} step={10} value={settings.backgroundReactMaxHz} onChange={(event) => onSettingsChange({ ...settings, backgroundReactMaxHz: Number(event.target.value) })} /></label>
						</div>
					)}

					{activeTab === "text" && (
						<div className='grid gap-3 md:grid-cols-2 lg:grid-cols-4'>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2 md:col-span-2'>
								<span>Overlay Type</span>
								<select className='w-full rounded-md border border-white/10 bg-slate-900/70 p-1.5' value={settings.overlayMode} onChange={(event) => onSettingsChange({ ...settings, overlayMode: event.target.value as SpectrumSettings["overlayMode"] })}>
									<option value='text'>Text</option>
									<option value='logo'>Logo image</option>
								</select>
							</label>
							{settings.overlayMode === "text" && (
								<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2 md:col-span-2'>
									<span>Overlay Text</span>
									<input type='text' value={settings.overlayText} placeholder='Nhập chữ muốn hiển thị...' onChange={(event) => onSettingsChange({ ...settings, overlayText: event.target.value })} className='w-full rounded-md border border-white/10 bg-slate-900/70 p-1.5 text-slate-100' />
								</label>
							)}
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'><span>Size: {Math.round(settings.overlayTextSize)} px</span><input type='range' min={16} max={260} step={1} value={settings.overlayTextSize} onChange={(event) => onSettingsChange({ ...settings, overlayTextSize: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'><span>Opacity: {settings.overlayTextOpacity.toFixed(2)}</span><input type='range' min={0} max={1} step={0.01} value={settings.overlayTextOpacity} onChange={(event) => onSettingsChange({ ...settings, overlayTextOpacity: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'><span>X: {Math.round(settings.overlayTextX)} px</span><input type='range' min={-960} max={960} step={1} value={settings.overlayTextX} onChange={(event) => onSettingsChange({ ...settings, overlayTextX: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'><span>Y: {Math.round(settings.overlayTextY)} px</span><input type='range' min={40} max={900} step={1} value={settings.overlayTextY} onChange={(event) => onSettingsChange({ ...settings, overlayTextY: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'><span>Scale: {settings.overlayTextScale.toFixed(2)}x</span><input type='range' min={0.3} max={3} step={0.01} value={settings.overlayTextScale} onChange={(event) => onSettingsChange({ ...settings, overlayTextScale: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'><span>Blur: {settings.overlayTextBlur.toFixed(1)} px</span><input type='range' min={0} max={20} step={0.1} value={settings.overlayTextBlur} onChange={(event) => onSettingsChange({ ...settings, overlayTextBlur: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'><span>Wiggle: {settings.overlayTextWiggle.toFixed(1)} px</span><input type='range' min={0} max={80} step={0.5} value={settings.overlayTextWiggle} onChange={(event) => onSettingsChange({ ...settings, overlayTextWiggle: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'><span>React Strength: {settings.overlayTextReactStrength.toFixed(2)}</span><input type='range' min={0} max={2} step={0.01} value={settings.overlayTextReactStrength} onChange={(event) => onSettingsChange({ ...settings, overlayTextReactStrength: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'><span>React Glow: {settings.overlayTextReactGlow.toFixed(2)}</span><input type='range' min={0} max={2} step={0.01} value={settings.overlayTextReactGlow} onChange={(event) => onSettingsChange({ ...settings, overlayTextReactGlow: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'><span>React Min: {settings.overlayTextReactMinHz} Hz</span><input type='range' min={0} max={20000} step={10} value={settings.overlayTextReactMinHz} onChange={(event) => onSettingsChange({ ...settings, overlayTextReactMinHz: Number(event.target.value) })} /></label>
							<label className='space-y-1 rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-2'><span>React Max: {settings.overlayTextReactMaxHz} Hz</span><input type='range' min={20} max={22000} step={10} value={settings.overlayTextReactMaxHz} onChange={(event) => onSettingsChange({ ...settings, overlayTextReactMaxHz: Number(event.target.value) })} /></label>
						</div>
					)}

					{activeTab === "extension" && (
						<div className='space-y-3 rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-3 text-slate-100'>
							<label className='flex items-center justify-between rounded-lg border border-emerald-300/30 bg-emerald-950/30 p-2'>
								<div>
									<p className='text-sm font-semibold'>Bật custom extension code</p>
									<p className='text-[11px] text-slate-300'>Code chạy mỗi frame, dùng object <code>context</code> để vẽ thêm layer.</p>
								</div>
								<input type='checkbox' checked={settings.extensionEnabled} onChange={(event) => onSettingsChange({ ...settings, extensionEnabled: event.target.checked })} />
							</label>

							<div className='rounded-lg border border-white/10 bg-slate-900/60 p-2 text-[11px] text-slate-300'>
								<p className='font-semibold text-slate-100'>Hướng dẫn nhanh</p>
								<ul className='mt-1 list-disc space-y-1 pl-4'>
									<li>Viết JavaScript hợp lệ, không cần <code>function</code>, chỉ cần nội dung xử lý.</li>
									<li>Dùng <code>context.ctx</code> như canvas 2D context.</li>
									<li>Có sẵn dữ liệu âm thanh: <code>context.frequencyData</code>, <code>context.timeData</code>, <code>context.bassIntensity</code>.</li>
									<li>Một đoạn code lỗi runtime sẽ tự dừng để tránh spam log.</li>
								</ul>
							</div>

							<div className='grid gap-3 md:grid-cols-3'>
								<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/60 p-2'>
									<span className='flex items-center justify-between'>
										<span>Spectrum Extension</span>
										<button type='button' className='rounded border border-white/15 px-2 py-0.5 text-[10px] hover:bg-white/10' onClick={() => onSettingsChange({ ...settings, extensionSpectrumCode: EXTENSION_SAMPLES.spectrum })}>Mẫu</button>
									</span>
									<textarea value={settings.extensionSpectrumCode} onChange={(event) => onSettingsChange({ ...settings, extensionSpectrumCode: event.target.value })} rows={12} className='w-full rounded-md border border-white/10 bg-slate-950/80 p-2 font-mono text-[11px] text-cyan-100' placeholder='// Viết code spectrum mở rộng ở đây' />
								</label>
								<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/60 p-2'>
									<span className='flex items-center justify-between'>
										<span>Background Extension</span>
										<button type='button' className='rounded border border-white/15 px-2 py-0.5 text-[10px] hover:bg-white/10' onClick={() => onSettingsChange({ ...settings, extensionBackgroundCode: EXTENSION_SAMPLES.background })}>Mẫu</button>
									</span>
									<textarea value={settings.extensionBackgroundCode} onChange={(event) => onSettingsChange({ ...settings, extensionBackgroundCode: event.target.value })} rows={12} className='w-full rounded-md border border-white/10 bg-slate-950/80 p-2 font-mono text-[11px] text-fuchsia-100' placeholder='// Viết code background mở rộng ở đây' />
								</label>
								<label className='space-y-1 rounded-lg border border-white/10 bg-slate-900/60 p-2'>
									<span className='flex items-center justify-between'>
										<span>Text Extension</span>
										<button type='button' className='rounded border border-white/15 px-2 py-0.5 text-[10px] hover:bg-white/10' onClick={() => onSettingsChange({ ...settings, extensionTextCode: EXTENSION_SAMPLES.text })}>Mẫu</button>
									</span>
									<textarea value={settings.extensionTextCode} onChange={(event) => onSettingsChange({ ...settings, extensionTextCode: event.target.value })} rows={12} className='w-full rounded-md border border-white/10 bg-slate-950/80 p-2 font-mono text-[11px] text-amber-100' placeholder='// Viết code text mở rộng ở đây' />
								</label>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
