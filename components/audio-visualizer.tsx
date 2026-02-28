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
  const [mode, setMode] = useState<VisualizationMode>('bars');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [exportCanvas, setExportCanvas] = useState<HTMLCanvasElement | null>(null);

  const bassIntensity = useMemo(() => {
    if (!audio.frequencyData.length) return 0;
    const bassBins = Math.max(1, Math.floor(audio.frequencyData.length * 0.06));
    const sample = audio.frequencyData.slice(0, bassBins);
    const avg = sample.reduce((sum, value) => sum + value, 0) / bassBins;
    return avg / 255;
  }, [audio.frequencyData]);

  const onBackgroundLoad = useCallback((file: File) => {
    const nextUrl = URL.createObjectURL(file);
    setBackgroundImage((current) => {
      if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
      return nextUrl;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (backgroundImage?.startsWith('blob:')) URL.revokeObjectURL(backgroundImage);
    };
  }, [backgroundImage]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0a0e27] text-slate-100">
      <BassPulseBackground backgroundImage={backgroundImage} bassIntensity={bassIntensity} />

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
        onAudioLoad={audio.loadAudio}
        onBackgroundLoad={onBackgroundLoad}
        backgroundImage={backgroundImage}
        onRemoveBackground={() => {
          setBackgroundImage((current) => {
            if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
            return null;
          });
        }}
      />

      <VideoExport
        exportCanvas={exportCanvas}
        getAudioTrack={audio.getAudioTrack}
        duration={audio.state.duration}
      />

      <PlaybackControls
        isPlaying={audio.state.isPlaying}
        currentTime={audio.state.currentTime}
        duration={audio.state.duration}
        volume={audio.state.volume}
        isLoading={audio.state.isLoading}
        mode={mode}
        onPlay={() => {
          audio.play().catch(() => {
            // noop
          });
        }}
        onPause={audio.pause}
        onSeek={audio.seek}
        onVolumeChange={audio.setVolume}
        onModeChange={setMode}
      />
    </div>
  );
}
