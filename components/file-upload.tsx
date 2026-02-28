'use client';

import { Upload, Music, Image as ImageIcon, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface FileUploadProps {
  onAudioLoad: (file: File) => void;
  onBackgroundLoad: (file: File) => void;
  audioLoaded: boolean;
  backgroundImage: string | null;
  onRemoveBackground: () => void;
}

export function FileUpload({
  onAudioLoad,
  onBackgroundLoad,
  audioLoaded,
  backgroundImage,
  onRemoveBackground,
}: FileUploadProps) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [imageFileName, setImageFileName] = useState<string>('');

  const handleAudioFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith('audio/')) {
        setAudioFileName(file.name);
        onAudioLoad(file);
      } else if (file) {
        alert('Please select a valid audio file (MP3, WAV, OGG, etc.)');
      }
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }
    },
    [onAudioLoad]
  );

  const handleImageFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        setImageFileName(file.name);
        onBackgroundLoad(file);
      } else if (file) {
        alert('Please select a valid image file (JPG, PNG, GIF, etc.)');
      }
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    },
    [onBackgroundLoad]
  );

  const handleRemoveBackground = useCallback(() => {
    setImageFileName('');
    onRemoveBackground();
  }, [onRemoveBackground]);

  return (
    <div className="fixed top-6 left-6 right-6 flex items-center justify-between gap-4 z-20">
      {/* File Upload Buttons */}
      <div className="flex items-center gap-3">
        {/* Audio Upload */}
        <div className="relative group">
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioFileSelect}
            className="hidden"
            aria-label="Upload audio file"
          />
          <button
            onClick={() => audioInputRef.current?.click()}
            className="px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur-sm border border-slate-700/50 hover:border-slate-600 text-slate-100 flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Music size={18} />
            <span className="hidden sm:inline text-sm font-medium">
              {audioFileName ? audioFileName.substring(0, 20) : 'Audio'}
            </span>
            <span className="sm:hidden">
              <Music size={18} />
            </span>
          </button>
        </div>

        {/* Background Image Upload */}
        <div className="relative group">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageFileSelect}
            className="hidden"
            aria-label="Upload background image"
          />
          <button
            onClick={() => imageInputRef.current?.click()}
            className="px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur-sm border border-slate-700/50 hover:border-slate-600 text-slate-100 flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <ImageIcon size={18} />
            <span className="hidden sm:inline text-sm font-medium">
              {imageFileName ? imageFileName.substring(0, 20) : 'Background'}
            </span>
            <span className="sm:hidden">
              <ImageIcon size={18} />
            </span>
          </button>
        </div>
      </div>

      {/* Remove Background Button */}
      {backgroundImage && (
        <button
          onClick={handleRemoveBackground}
          className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 flex items-center gap-2 transition-all duration-200"
          aria-label="Remove background image"
        >
          <X size={16} />
          <span className="text-xs font-medium">Remove</span>
        </button>
      )}
    </div>
  );
}
