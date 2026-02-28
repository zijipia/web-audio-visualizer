'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAudioContext } from '@/hooks/use-audio-context';
import { VisualizationCanvas, type VisualizationMode } from '@/components/visualization-canvas';
import { PlaybackControls } from '@/components/playback-controls';
import { FileUpload } from '@/components/file-upload';
import { BassPulse } from '@/components/bass-pulse';
import { VideoExport } from '@/components/video-export';
import { ModeSwitcher } from '@/components/mode-switcher';

export default function Page() {
  const [mode, setMode] = useState<VisualizationMode>('bars');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [bassIntensity, setBassIntensity] = useState(0);

  const audio = useAudioContext();

  // Handle audio file upload
  const handleAudioLoad = useCallback(
    async (file: File) => {
      await audio.loadAudio(file);
    },
    [audio]
  );

  // Handle background image upload
  const handleBackgroundLoad = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Revoke old URL if exists
        if (backgroundImage && backgroundImage.startsWith('blob:')) {
          URL.revokeObjectURL(backgroundImage);
        }
        setBackgroundImage(result);
      };
      reader.readAsDataURL(file);
    },
    [backgroundImage]
  );

  // Handle background removal
  const handleRemoveBackground = useCallback(() => {
    if (backgroundImage && backgroundImage.startsWith('blob:')) {
      URL.revokeObjectURL(backgroundImage);
    }
    setBackgroundImage(null);
  }, [backgroundImage]);

  // Calculate bass intensity for effects
  useEffect(() => {
    if (audio.frequencyData.length === 0) return;

    // Extract bass frequencies (first 10% of frequency data)
    const bassRange = audio.frequencyData.slice(
      0,
      Math.floor(audio.frequencyData.length * 0.1)
    );
    const average = bassRange.reduce((a, b) => a + b, 0) / bassRange.length / 255;
    setBassIntensity(average);
  }, [audio.frequencyData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (backgroundImage && backgroundImage.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(backgroundImage);
        } catch (e) {
          // Ignore errors
        }
      }
      audio.cleanup();
    };
  }, [audio, backgroundImage]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950">
      {/* Background with Bass Pulse */}
      <BassPulse frequencyData={audio.frequencyData} backgroundImage={backgroundImage} />

      {/* Main Canvas Visualization */}
      <div className="absolute inset-0">
        <VisualizationCanvas
          frequencyData={audio.frequencyData}
          timeData={audio.timeData}
          mode={mode}
          isPlaying={audio.state.isPlaying}
          duration={audio.state.duration}
          currentTime={audio.state.currentTime}
          onSeek={audio.seek}
          bassIntensity={bassIntensity}
        />
      </div>

      {/* UI Layer */}
      <div className="relative z-10 pointer-events-none">
        {/* File Upload Controls */}
        <FileUpload
          onAudioLoad={handleAudioLoad}
          onBackgroundLoad={handleBackgroundLoad}
          audioLoaded={!!audio.audioElement}
          backgroundImage={backgroundImage}
          onRemoveBackground={handleRemoveBackground}
        />

        {/* Mode Switcher */}
        <ModeSwitcher currentMode={mode} onModeChange={setMode} />

        {/* Video Export */}
        <div className="pointer-events-auto">
          <VideoExport
            isPlaying={audio.state.isPlaying}
            duration={audio.state.duration}
            currentTime={audio.state.currentTime}
            audioContext={audio.audioContext}
            audioElement={audio.audioElement}
            frequencyData={audio.frequencyData}
            timeData={audio.timeData}
            mode={mode}
            bassIntensity={bassIntensity}
          />
        </div>

        {/* Playback Controls */}
        <div className="pointer-events-auto">
          <PlaybackControls
            isPlaying={audio.state.isPlaying}
            currentTime={audio.state.currentTime}
            duration={audio.state.duration}
            volume={audio.state.volume}
            isLoading={audio.state.isLoading}
            onPlay={audio.play}
            onPause={audio.pause}
            onSeek={audio.seek}
            onVolumeChange={audio.setVolume}
          />
        </div>
      </div>

      {/* Idle State Message */}
      {!audio.audioElement?.src && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-4 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-100 text-balance">
              Audio Visualizer
            </h1>
            <p className="text-slate-400 text-lg">
              Upload an MP3 file to get started
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
