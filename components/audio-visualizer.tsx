'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BassPulseBackground } from '@/components/bass-pulse-background';
import { FileUpload } from '@/components/file-upload';
import { PlaybackControls } from '@/components/playback-controls';
import { VideoExport } from '@/components/video-export';
import { VisualizationCanvas, type VisualizationMode } from '@/components/visualization-canvas';
import { useAudioContext } from '@/hooks/use-audio-context';

export function AudioVisualizer() {
  const audio = useAudioContext();

  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [mode, setMode] = useState<VisualizationMode>('bars');
  const [exportCanvas, setExportCanvas] = useState<HTMLCanvasElement | null>(null);

  const bassIntensity = useMemo(() => {
    if (!audio.frequencyData.length) return 0;
    const maxFrequency = 256;
    const nyquist = (audio.audioContext?.sampleRate ?? 44100) / 2;
    const count = Math.max(1, Math.floor((maxFrequency / nyquist) * audio.frequencyData.length));

    let sum = 0;
    for (let i = 0; i < count; i += 1) sum += audio.frequencyData[i] ?? 0;
    return Math.min(1, sum / count / 255);
  }, [audio.audioContext?.sampleRate, audio.frequencyData, audio.state.currentTime]);

  const loadAudio = useCallback(
    async (file: File) => {
      setAudioFileName(file.name);
      await audio.loadAudio(file);
    },
    [audio]
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
    <main className="relative h-screen w-full overflow-hidden text-slate-100">
      <BassPulseBackground bassIntensity={bassIntensity} backgroundImage={backgroundImage} />

      <VisualizationCanvas
        frequencyData={audio.frequencyData}
        timeData={audio.timeData}
        mode={mode}
        duration={audio.state.duration}
        currentTime={audio.state.currentTime}
        onSeek={audio.seek}
        onExportCanvasReady={setExportCanvas}
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
        recordingAudioStream={audio.getRecordingStream()}
        duration={audio.state.duration}
        currentTime={audio.state.currentTime}
      />

      <PlaybackControls
        isPlaying={audio.state.isPlaying}
        currentTime={audio.state.currentTime}
        duration={audio.state.duration}
        volume={audio.state.volume}
        isLoading={audio.state.isLoading}
        mode={mode}
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
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-8 py-6 text-center backdrop-blur-xl">
            <h1 className="text-3xl font-semibold">Web Audio Visualizer</h1>
            <p className="mt-2 text-sm text-slate-300">Upload an MP3 to start real-time visualization.</p>
          </div>
        </div>
      )}
    </main>
  );
}
