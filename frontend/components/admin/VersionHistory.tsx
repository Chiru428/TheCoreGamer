'use client';

import { useState } from 'react';import { Spinner } from '@/components/ui/Spinner';

import useSWR from 'swr';
import { History, RotateCcw, ChevronDown, ChevronRight, FileDiff } from 'lucide-react';

import Button from '@/components/ui/Button';
import { useUIStore } from '@/store/uiStore';
import VersionDiffModal from './VersionDiffModal';

interface Version {
  id: string;
  versionNumber: number;
  title: string;
  createdAt: string;
  editor: {
    displayName: string;
  };
}

interface VersionHistoryProps {
  articleSlug: string;
  currentContent?: any;
}

export default function VersionHistory({ articleSlug, currentContent }: VersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [diffOld, setDiffOld] = useState<any>(null);
  const [diffNew, setDiffNew] = useState<any>(null);
  const { addToast } = useUIStore();

  const { data: response, error, mutate } = useSWR<{ success: boolean; data: Version[] }>(
    isOpen ? `/api/posts/${articleSlug}/versions` : null
  );

  const handleRestore = async (versionId: string) => {
    if (!confirm('Are you sure you want to restore this version? This will create a new version snapshot.')) {
      return;
    }

    setIsRestoring(versionId);
    try {
      const res = await fetch(`/api/posts/${articleSlug}/versions/${versionId}/restore`, {
        method: 'POST',
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to restore version');

      addToast({ message: 'Version restored successfully', type: 'success' });
      mutate();
      // Optionally reload the page to refresh the editor with restored content
      window.location.reload();
    } catch (err: any) {
      addToast({ message: err.message, type: 'error' });
    } finally {
      setIsRestoring(null);
    }
  };

  return (
    <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-bg-elevated transition-colors"
      >
        <div className="flex items-center gap-2 text-text-primary font-medium">
          <History className="w-4 h-4 text-accent-light" />
          Version History
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="p-4 pt-0 border-t border-border">
          {!response && !error && (
            <div className="py-4 flex justify-center">
              <Spinner className="w-5 h-5 animate-spin text-accent-light" />
            </div>
          )}
          {error && <p className="text-sm text-red-500 py-2">Failed to load versions.</p>}
          {response?.data?.length === 0 && (
            <p className="text-sm text-text-muted py-2">No previous versions found.</p>
          )}

          <div className="space-y-3 mt-3">
            {response?.data?.map((version) => (
              <div key={version.id} className="p-3 bg-bg-primary rounded-lg border border-border flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/20 text-accent-light">
                      v{version.versionNumber}
                    </span>
                    <p className="text-sm font-medium text-text-primary mt-1 truncate max-w-[200px]">
                      {version.title}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDiffOld(version);
                        setDiffNew({ versionNumber: 'Current (Editor)', content: currentContent });
                        setDiffModalOpen(true);
                      }}
                      title="Compare to current editor"
                      className="h-8 w-8 p-0 shrink-0 text-text-muted hover:text-accent"
                    >
                      <FileDiff className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRestore(version.id)}
                      loading={isRestoring === version.id}
                      title="Restore this version"
                      className="h-8 w-8 p-0 shrink-0"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-text-muted">
                  <span>{version.editor.displayName}</span>
                  <span>{new Date(version.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <VersionDiffModal 
        isOpen={diffModalOpen} 
        onClose={() => setDiffModalOpen(false)} 
        oldVersion={diffOld} 
        newVersion={diffNew} 
      />
    </div>
  );
}
