'use client';

import { useState } from 'react';
import MuxUploader from '@mux/mux-uploader-react';
import { useUIStore } from '@/store/uiStore';
import { Video } from 'lucide-react';

interface VideoUploaderProps {
  onSuccess?: (data: { uploadId: string, videoAssetId: string }) => void;
}

export default function VideoUploader({ onSuccess }: VideoUploaderProps) {
  const { addToast } = useUIStore();
  const [uploadInfo, setUploadInfo] = useState<{ uploadId: string, videoAssetId: string } | null>(null);

  const getUploadUrl = async () => {
    try {
      const res = await fetch('/api/upload/video', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'CMS Upload' }),
      });
      const json = await res.json();

      if (json.success && json.data) {
        setUploadInfo({
          uploadId: json.data.uploadId,
          videoAssetId: json.data.videoAssetId,
        });
        return json.data.url;
      } else {
        addToast({ type: 'error', message: 'Failed to generate upload URL' });
        throw new Error('Failed to generate upload URL');
      }
    } catch (err) {
      addToast({ type: 'error', message: 'Network error — could not start upload' });
      throw err;
    }
  };

  const handleSuccess = () => {
    addToast({ type: 'success', message: 'Video uploaded successfully! Processing will begin shortly.' });
    if (onSuccess && uploadInfo) {
      onSuccess(uploadInfo);
    }
  };

  return (
    <div className="bg-bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Video className="w-5 h-5 text-accent" />
        <h3 className="font-semibold text-text-primary text-sm">Upload Video (Mux)</h3>
      </div>
      <div className="mux-uploader-container">
        <MuxUploader 
          endpoint={getUploadUrl} 
          onSuccess={handleSuccess}
        />
      </div>
      <p className="text-xs text-text-muted mt-3">
        Video will be uploaded to Mux and automatically processed.
      </p>
    </div>
  );
}
