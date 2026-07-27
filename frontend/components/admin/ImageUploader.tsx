'use client';

import { useRef, useState } from 'react';import { Spinner } from '@/components/ui/Spinner';

import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { uploadImage } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import MediaLibrary from './MediaLibrary';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  className?: string;
}

type Tab = 'upload' | 'library';

export default function ImageUploader({ value, onChange, className }: ImageUploaderProps) {
  const { addToast } = useUIStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [folder, setFolder] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const res = await uploadImage(file, folder || undefined);
    setUploading(false);
    if (res.data?.url) {
      onChange(res.data.url);
      addToast({ type: 'success', message: 'Image uploaded' });
    } else {
      addToast({ type: 'error', message: 'Upload failed' });
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg transition-colors border border-border bg-bg-surface hover:bg-bg-elevated text-text-primary"
        >
          <Upload className="w-3.5 h-3.5" /> Upload
        </button>
        <button
          type="button"
          onClick={() => setShowLibrary(true)}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg transition-colors border border-border bg-bg-surface hover:bg-bg-elevated text-text-primary"
        >
          <ImageIcon className="w-3.5 h-3.5" /> Browse Library
        </button>
      </div>

      {/* Upload Dropzone / Image Preview */}
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border group">
          <img src={value} alt="Featured" className="w-full h-48 object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full h-48 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-text-muted hover:border-accent hover:text-accent-light transition-colors"
          >
            {uploading ? <Spinner className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
            <span className="text-sm">{uploading ? 'Uploading...' : 'Click to upload image'}</span>
          </button>
          <input
            type="text"
            placeholder="Add to folder (optional)"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            disabled={uploading}
            className="w-full px-3 py-2 text-sm bg-bg-surface border border-border rounded-lg outline-none text-text-primary"
          />
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {/* Library Modal */}
      {showLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-bg-primary w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border bg-bg-surface">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-accent" />
                Media Library
              </h2>
              <button 
                type="button" 
                onClick={() => setShowLibrary(false)}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto min-h-[400px]">
              <MediaLibrary
                onSelect={(url) => {
                  onChange(url);
                  setShowLibrary(false);
                  addToast({ type: 'success', message: 'Image selected from library' });
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
