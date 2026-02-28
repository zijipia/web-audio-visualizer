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
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [imageFileName, setImageFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      if (file.type.startsWith('audio/')) {
        setAudioFileName(file.name);
        onAudioLoad(file);
        return true;
      } else if (file.type.startsWith('image/')) {
        setImageFileName(file.name);
        onBackgroundLoad(file);
        return true;
      }
      return false;
    },
    [onAudioLoad, onBackgroundLoad]
  );

  const handleAudioFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (!processFile(file)) {
          alert('Please select a valid audio file (MP3, WAV, OGG, etc.)');
        }
      }
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }
    },
    [processFile]
  );

  const handleImageFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (!processFile(file)) {
          alert('Please select a valid image file (JPG, PNG, GIF, etc.)');
        }
      }
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        if (processFile(file)) {
          break; // Process only the first valid file
        }
      }
    },
    [processFile]
  );

  const handleRemoveBackground = useCallback(() => {
    setImageFileName('');
    onRemoveBackground();
  }, [onRemoveBackground]);

  return (
    <>
      {/* Drag and Drop Zone - Center Screen */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`fixed inset-0 flex items-center justify-center z-30 pointer-events-none transition-all duration-200 ${
          isDragging ? 'pointer-events-auto' : ''
        }`}
      >
        <div
          className={`absolute inset-0 border-4 border-dashed rounded-lg flex flex-col items-center justify-center gap-4 transition-all duration-200 ${
            isDragging
              ? 'border-orange-500 bg-orange-500/10 pointer-events-auto'
              : 'border-slate-600 bg-transparent'
          }`}
        >
          {isDragging && (
            <div className="text-center animate-fade-in">
              <Upload size={48} className="text-orange-500 mx-auto mb-2" />
              <p className="text-xl font-semibold text-orange-400">
                Drop your audio file or image here
              </p>
              <p className="text-sm text-slate-400 mt-2">
                Audio formats: MP3, WAV, OGG, FLAC • Image formats: JPG, PNG, GIF, WebP
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Header Controls */}
      <div className="fixed top-6 left-6 right-6 flex items-center justify-between gap-4 z-20 pointer-events-auto">
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
              className="px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur-sm border border-slate-700/50 hover:border-orange-500/50 text-slate-100 hover:text-orange-400 flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
              title="Click to upload audio file"
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
              className="px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur-sm border border-slate-700/50 hover:border-orange-500/50 text-slate-100 hover:text-orange-400 flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
              title="Click to upload background image"
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
            className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 hover:text-red-200 flex items-center gap-2 transition-all duration-200"
            aria-label="Remove background image"
          >
            <X size={16} />
            <span className="text-xs font-medium">Remove</span>
          </button>
        )}
      </div>
    </>
  );
}
