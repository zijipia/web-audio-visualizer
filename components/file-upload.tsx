'use client';

import { ImagePlus, Music2, Upload, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

interface FileUploadProps {
  onAudioLoad: (file: File) => Promise<void> | void;
  onBackgroundLoad: (file: File) => void;
  backgroundImage: string | null;
  audioFileName: string | null;
  onRemoveBackground: () => void;
}

const MAX_AUDIO_MB = 50;
const MAX_IMAGE_MB = 15;

export function FileUpload({
  onAudioLoad,
  onBackgroundLoad,
  backgroundImage,
  audioFileName,
  onRemoveBackground,
}: FileUploadProps) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const backgroundLabel = useMemo(() => imageName ?? 'Background', [imageName]);

  const validateAudio = (file: File) => {
    if (file.type !== 'audio/mpeg') {
      return 'Only MP3 files are supported.';
    }
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) {
      return `Audio file must be smaller than ${MAX_AUDIO_MB}MB.`;
    }
    return null;
  };

  const validateImage = (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      return 'Background must be PNG, JPG, or WebP.';
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      return `Background image must be smaller than ${MAX_IMAGE_MB}MB.`;
    }
    return null;
  };

  const handleAudioChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateAudio(file);
    if (validationError) {
      setErrorMessage(validationError);
    } else {
      setErrorMessage(null);
      await onAudioLoad(file);
    }

    event.target.value = '';
  };

  const handleBackgroundChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateImage(file);
    if (validationError) {
      setErrorMessage(validationError);
    } else {
      setErrorMessage(null);
      setImageName(file.name);
      onBackgroundLoad(file);
    }

    event.target.value = '';
  };

  return (
    <div className="pointer-events-auto fixed left-3 top-3 z-30 w-[min(460px,calc(100vw-1.5rem))] space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-3 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-2">
        <input ref={audioInputRef} type="file" accept="audio/mpeg" className="hidden" onChange={handleAudioChange} />
        <input
          ref={backgroundInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleBackgroundChange}
        />

        <button
          onClick={() => audioInputRef.current?.click()}
          className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10"
        >
          <Music2 size={16} />
          {audioFileName ?? 'Upload MP3'}
        </button>

        <button
          onClick={() => backgroundInputRef.current?.click()}
          className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10"
        >
          <ImagePlus size={16} />
          {backgroundLabel}
        </button>

        {backgroundImage && (
          <button
            onClick={onRemoveBackground}
            className="rounded-lg border border-red-300/25 bg-red-500/10 p-2 text-red-200 transition hover:bg-red-500/20"
            aria-label="Remove background"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {backgroundImage && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <img src={backgroundImage} alt="Background preview" className="h-20 w-full object-cover" />
        </div>
      )}

      {errorMessage ? (
        <p className="text-xs text-red-300">{errorMessage}</p>
      ) : (
        <p className="flex items-center gap-1 text-xs text-slate-300">
          <Upload size={12} /> MP3 audio + PNG/JPG/WebP background
        </p>
      )}
    </div>
  );
}
