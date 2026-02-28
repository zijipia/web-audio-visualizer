'use client';

import { Download, Loader2, Video } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface VideoExportProps {
  exportCanvas: HTMLCanvasElement | null;
  getAudioTrack: () => MediaStreamTrack | null;
  duration: number;
}

export function VideoExport({ exportCanvas, getAudioTrack, duration }: VideoExportProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const estimateSize = useMemo(() => {
    const mb = (duration * 5_000_000) / 8 / 1024 / 1024;
    return `${Math.max(mb, 0).toFixed(1)} MB`;
  }, [duration]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [blobUrl]);

  const startRecording = () => {
    if (!exportCanvas) {
      alert('Visualizer canvas is not ready yet.');
      return;
    }

    const stream = exportCanvas.captureStream(30);
    const audioTrack = getAudioTrack();
    if (audioTrack) stream.addTrack(audioTrack);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5_000_000,
    });

    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      setIsProcessing(true);
      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      const nextUrl = URL.createObjectURL(blob);
      setBlobUrl(nextUrl);
      setIsProcessing(false);
      setIsRecording(false);
      stream.getTracks().forEach((track) => track.stop());
    };

    recorder.start(200);
    recorderRef.current = recorder;
    streamRef.current = stream;
    setBlobUrl((existing) => {
      if (existing) URL.revokeObjectURL(existing);
      return null;
    });
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
  };

  return (
    <div className="fixed right-4 top-20 z-30 w-52 rounded-xl border border-white/15 bg-black/30 p-3 text-white backdrop-blur-md md:right-8">
      <div className="mb-2 text-xs text-slate-300">
        Duration: {formatTime(duration)} · Est: {estimateSize}
      </div>

      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`mb-2 flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm ${
          isRecording ? 'bg-red-500/70' : 'bg-cyan-500/80 text-slate-950'
        }`}
      >
        {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Video size={14} />}
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>

      {blobUrl && (
        <a
          href={blobUrl}
          download={`visualization_${Date.now()}.webm`}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-500/80 px-3 py-2 text-sm text-slate-950"
        >
          <Download size={14} /> Download WebM
        </a>
      )}
    </div>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
