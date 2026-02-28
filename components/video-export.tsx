'use client';

import { Download, Loader2, Video } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface VideoExportProps {
  exportCanvas: HTMLCanvasElement | null;
  recordingAudioStream: MediaStream | null;
  duration: number;
  currentTime: number;
}

interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  recordedBlobUrl: string | null;
}

export function VideoExport({ exportCanvas, recordingAudioStream, duration, currentTime }: VideoExportProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isProcessing: false,
    recordedBlobUrl: null,
  });

  const estimatedSize = useMemo(() => {
    if (!duration) return '—';
    const mb = (duration * 4.8) / 8;
    return `${Math.max(1, Math.round(mb))} MB`;
  }, [duration]);

  const cleanupUrl = useCallback(() => {
    setState((prev) => {
      if (prev.recordedBlobUrl) {
        URL.revokeObjectURL(prev.recordedBlobUrl);
      }
      return { ...prev, recordedBlobUrl: null };
    });
  }, []);

  useEffect(() => {
    return () => {
      cleanupUrl();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [cleanupUrl]);

  const startRecording = useCallback(() => {
    if (!exportCanvas) {
      window.alert('Visualizer canvas is not ready yet.');
      return;
    }

    cleanupUrl();

    const videoStream = exportCanvas.captureStream(30);
    const mergedStream = new MediaStream();

    videoStream.getVideoTracks().forEach((track) => mergedStream.addTrack(track));
    recordingAudioStream?.getAudioTracks().forEach((track) => mergedStream.addTrack(track));

    streamRef.current = mergedStream;

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : 'video/webm';

    const recorder = new MediaRecorder(mergedStream, {
      mimeType,
      videoBitsPerSecond: 8_000_000,
      audioBitsPerSecond: 192_000,
    });

    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setState((prev) => ({ ...prev, isRecording: false, isProcessing: false, recordedBlobUrl: url }));
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    setState((prev) => ({ ...prev, isRecording: true, isProcessing: false }));
    recorder.start(250);
  }, [cleanupUrl, exportCanvas, recordingAudioStream]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      setState((prev) => ({ ...prev, isProcessing: true }));
      recorderRef.current.stop();
    }
  }, []);

  const downloadRecording = useCallback(() => {
    if (!state.recordedBlobUrl) return;
    const link = document.createElement('a');
    link.href = state.recordedBlobUrl;
    link.download = `visualization_${Date.now()}.webm`;
    link.click();
  }, [state.recordedBlobUrl]);

  return (
    <div className="pointer-events-auto fixed right-3 top-3 z-30 w-[min(300px,calc(100vw-1.5rem))] rounded-2xl border border-white/10 bg-slate-950/40 p-3 backdrop-blur-xl">
      <h2 className="mb-2 text-sm font-semibold text-slate-100">Video Export</h2>
      <p className="text-xs text-slate-300">Estimated size: {estimatedSize}</p>
      <p className="mb-3 text-xs text-slate-300">Duration: {Math.round(duration || currentTime)}s</p>

      <div className="flex items-center gap-2">
        <button
          onClick={state.isRecording ? stopRecording : startRecording}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
            state.isRecording
              ? 'bg-red-500/20 text-red-100 hover:bg-red-500/30'
              : 'bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30'
          }`}
        >
          {state.isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
          {state.isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>

        <button
          onClick={downloadRecording}
          disabled={!state.recordedBlobUrl}
          className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Download size={16} /> Download
        </button>
      </div>
    </div>
  );
}
