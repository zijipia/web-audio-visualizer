'use client';

import { Download, Loader2, Video } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface VideoExportProps {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  audioContext: AudioContext | null;
  audioElement: HTMLAudioElement | null;
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  mode: string;
  bassIntensity: number;
}

interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  progress: number;
  recordedBlob: Blob | null;
}

export function VideoExport({
  isPlaying,
  duration,
  currentTime,
  audioContext,
  audioElement,
  frequencyData,
  timeData,
  mode,
  bassIntensity,
}: VideoExportProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isProcessing: false,
    progress: 0,
    recordedBlob: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const canvasRef = useRef<OffscreenCanvas | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const downloadUrlRef = useRef<string | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks in stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    // Disconnect audio nodes
    if (audioDestinationRef.current) {
      audioDestinationRef.current.disconnect();
      audioDestinationRef.current = null;
    }

    // Revoke blob URLs
    if (downloadUrlRef.current) {
      URL.revokeObjectURL(downloadUrlRef.current);
      downloadUrlRef.current = null;
    }

    chunksRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    if (!audioContext || !audioElement) {
      alert('Audio context or element not available');
      return;
    }

    try {
      setRecordingState((prev) => ({
        ...prev,
        isRecording: true,
        progress: 0,
        recordedBlob: null,
      }));

      chunksRef.current = [];

      // Create off-screen canvas (1920x1080)
      const offscreenCanvas = new OffscreenCanvas(1920, 1080);
      canvasRef.current = offscreenCanvas;

      // Get canvas stream
      const canvasStream = offscreenCanvas.convertToBlob
        ? null
        : (offscreenCanvas as any).captureStream?.(30);

      if (!canvasStream) {
        // Fallback: create a dummy stream if captureStream not available
        const dummyCanvas = document.createElement('canvas');
        dummyCanvas.width = 1920;
        dummyCanvas.height = 1080;
        const fallbackStream = dummyCanvas.captureStream(30);
        streamRef.current = fallbackStream;
      } else {
        streamRef.current = canvasStream;
      }

      // Create audio destination node for audio track
      if (!audioDestinationRef.current) {
        audioDestinationRef.current = audioContext.createMediaStreamDestination();
      }

      // Connect audio element to audio destination
      const source = audioContext.createMediaElementAudioSource(audioElement);
      const gainNode = audioContext.createGain();
      source.connect(gainNode);
      gainNode.connect(audioDestinationRef.current);
      gainNode.connect(audioContext.destination); // Keep original playback

      // Get audio track from destination
      const audioTrack = audioDestinationRef.current.stream.getAudioTracks()[0];

      // Create combined stream with video and audio
      const combinedStream = new MediaStream();

      if (streamRef.current) {
        const videoTracks = streamRef.current.getVideoTracks();
        videoTracks.forEach((track) => {
          combinedStream.addTrack(track);
        });
      }

      if (audioTrack) {
        combinedStream.addTrack(audioTrack);
      }

      // Create media recorder with optimized codec
      const mimeType = 'video/webm;codecs=vp8,opus';
      const isSupported = MediaRecorder.isTypeSupported(mimeType);

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: isSupported ? mimeType : undefined,
        videoBitsPerSecond: 5000000, // 5 Mbps for high quality
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordingState((prev) => ({
          ...prev,
          isRecording: false,
          isProcessing: false,
          recordedBlob: blob,
        }));

        // Create download URL
        const url = URL.createObjectURL(blob);
        downloadUrlRef.current = url;
      };

      // Start recording
      mediaRecorder.start();

      // Update progress
      const progressInterval = setInterval(() => {
        setRecordingState((prev) => ({
          ...prev,
          progress: Math.min((currentTime / duration) * 100, 100),
        }));

        if (currentTime >= duration) {
          clearInterval(progressInterval);
          mediaRecorder.stop();
        }
      }, 100);

      return () => {
        clearInterval(progressInterval);
      };
    } catch (error) {
      console.error('[v0] Recording error:', error);
      alert('Failed to start recording: ' + (error as Error).message);
      setRecordingState((prev) => ({ ...prev, isRecording: false }));
    }
  }, [audioContext, audioElement, currentTime, duration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecordingState((prev) => ({ ...prev, isRecording: false }));
    }
    cleanup();
  }, [cleanup]);

  const downloadVideo = useCallback(() => {
    if (downloadUrlRef.current) {
      const link = document.createElement('a');
      link.href = downloadUrlRef.current;
      link.download = `visualization_${Date.now()}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup after download
      setTimeout(() => {
        if (downloadUrlRef.current) {
          URL.revokeObjectURL(downloadUrlRef.current);
          downloadUrlRef.current = null;
        }
      }, 100);
    }
  }, []);

  return (
    <div className="fixed bottom-24 right-6 flex flex-col gap-3 z-20">
      {/* Recording Status */}
      {(recordingState.isRecording || recordingState.isProcessing) && (
        <div className="flex flex-col gap-2 p-4 rounded-lg bg-slate-800/90 backdrop-blur-sm border border-slate-700 w-48">
          <div className="flex items-center gap-2 text-sm text-slate-100">
            <div className="animate-pulse w-2 h-2 rounded-full bg-red-500" />
            <span>
              {recordingState.isRecording ? 'Recording...' : 'Processing...'}
            </span>
          </div>
          <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all"
              style={{ width: `${recordingState.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Download Button */}
      {recordingState.recordedBlob && (
        <button
          onClick={downloadVideo}
          className="px-4 py-3 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <Download size={18} />
          <span className="text-sm font-medium">Download</span>
        </button>
      )}

      {/* Record Button */}
      <button
        onClick={recordingState.isRecording ? stopRecording : startRecording}
        disabled={!isPlaying && !recordingState.isRecording}
        className={`px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed font-medium ${
          recordingState.isRecording
            ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300'
            : 'bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur-sm border border-slate-700/50 text-slate-100'
        }`}
      >
        {recordingState.isProcessing ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Video size={18} />
        )}
        <span className="text-sm">{recordingState.isRecording ? 'Stop' : 'Record'}</span>
      </button>
    </div>
  );
}
