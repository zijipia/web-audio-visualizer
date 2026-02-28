'use client';

import { Image as ImageIcon, Music, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface FileUploadProps {
  onAudioLoad: (file: File) => void;
  onBackgroundLoad: (file: File) => void;
  backgroundImage: string | null;
  onRemoveBackground: () => void;
}

const MAX_AUDIO_SIZE = 40 * 1024 * 1024;
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

export function FileUpload({ onAudioLoad, onBackgroundLoad, backgroundImage, onRemoveBackground }: FileUploadProps) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [audioName, setAudioName] = useState('MP3');
  const [imageName, setImageName] = useState('Background');

  const handleAudioFile = (file?: File) => {
    if (!file) return;
    if (file.type !== 'audio/mpeg') {
      alert('Please upload an MP3 file.');
      return;
    }
    if (file.size > MAX_AUDIO_SIZE) {
      alert('Audio file is too large (max 40MB).');
      return;
    }
    setAudioName(trimName(file.name));
    onAudioLoad(file);
  };

  const handleImageFile = (file?: File) => {
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Please upload PNG, JPG, or WebP.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      alert('Image file is too large (max 20MB).');
      return;
    }
    setImageName(trimName(file.name));
    onBackgroundLoad(file);
  };

  return (
    <div className="fixed left-4 right-4 top-4 z-30 flex items-center justify-between gap-2 pointer-events-auto md:left-8 md:right-8">
      <div className="flex gap-2">
        <input
          ref={audioInputRef}
          type="file"
          className="hidden"
          accept="audio/mpeg"
          onChange={(e) => {
            handleAudioFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => audioInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white backdrop-blur-md"
        >
          <Music size={16} />
          <span>{audioName}</span>
        </button>

        <input
          ref={imageInputRef}
          type="file"
          className="hidden"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            handleImageFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => imageInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white backdrop-blur-md"
        >
          <ImageIcon size={16} />
          <span>{imageName}</span>
        </button>
      </div>

      {backgroundImage ? (
        <button
          onClick={onRemoveBackground}
          className="inline-flex items-center gap-1 rounded-lg border border-red-400/30 bg-red-500/20 px-2 py-2 text-red-100"
        >
          <X size={14} /> Remove
        </button>
      ) : (
        <div className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-xs text-slate-200">
          <Upload size={14} /> Upload audio + image
        </div>
      )}
    </div>
  );
}

function trimName(name: string) {
  return name.length > 18 ? `${name.slice(0, 18)}…` : name;
}
