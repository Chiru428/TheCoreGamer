import { Download, FileIcon } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import type { MediaAttachment } from '@/types';

export default function AttachmentList({ attachments }: { attachments: MediaAttachment[] }) {
  if (!attachments.length) return null;
  return (
    <div className="my-6">
      <h4 className="text-sm font-semibold text-text-primary mb-3">Downloads</h4>
      <div className="space-y-2">
        {attachments.map(a => (
          <a key={a.id} href={a.fileUrl} download className="flex items-center gap-3 p-3 rounded-lg bg-bg-surface border border-border hover:border-border-hover transition-colors group">
            <FileIcon className="w-5 h-5 text-text-dim shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate group-hover:text-accent-light transition-colors">{a.filename}</p>
              <p className="text-xs text-text-dim">{formatFileSize(a.fileSizeBytes)}</p>
            </div>
            <Download className="w-4 h-4 text-text-dim group-hover:text-accent-light transition-colors" />
          </a>
        ))}
      </div>
    </div>
  );
}
