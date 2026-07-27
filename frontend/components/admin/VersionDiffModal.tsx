'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { diffWords, Change } from 'diff';
import DiffMatchPatch from 'diff-match-patch';

interface VersionDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  oldVersion: any;
  newVersion: any;
}

function extractTextFromNode(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (node.content && Array.isArray(node.content)) {
    return node.content.map(extractTextFromNode).join('');
  }
  return '\n';
}

function extractTextFromJson(jsonContent: any): string {
  if (!jsonContent) return '';
  if (Array.isArray(jsonContent)) {
    return jsonContent.map(extractTextFromNode).join('\n');
  }
  if (jsonContent.content) {
    return jsonContent.content.map(extractTextFromNode).join('\n');
  }
  if (typeof jsonContent === 'string') return jsonContent;
  return '';
}

// Strips any inline HTML tags before diffing, in case content carries markup.
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

function getPlainText(version: any): string {
  return stripHtml(extractTextFromJson(version?.content) || '');
}

function computeDiff(oldText: string, newText: string): React.ReactNode {
  const dmp = new DiffMatchPatch();
  const diffs = dmp.diff_main(oldText, newText);
  dmp.diff_cleanupSemantic(diffs);
  return diffs.map(([op, text], i) => {
    if (op === 1)  return <ins key={i} style={{ background: 'rgba(163,230,53,0.25)', textDecoration: 'none' }}>{text}</ins>;
    if (op === -1) return <del key={i} style={{ background: 'rgba(239,68,68,0.25)', color: 'rgba(255,255,255,0.5)', textDecoration: 'line-through' }}>{text}</del>;
    return <span key={i}>{text}</span>;
  });
}

const META_FIELDS: Array<{ key: string; label: string; format?: (v: any) => string }> = [
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'updatedAt', label: 'Updated At', format: (v) => (v ? new Date(v).toLocaleString() : '—') },
  { key: 'createdAt', label: 'Created At', format: (v) => (v ? new Date(v).toLocaleString() : '—') },
  { key: 'author', label: 'Author' },
];

function getMetaValue(version: any, key: string): any {
  if (key === 'author') return version?.editor?.displayName ?? version?.author ?? null;
  return version?.[key] ?? null;
}

function MetaRow({ label, oldValue, newValue, format }: { label: string; oldValue: any; newValue: any; format?: (v: any) => string }) {
  const display = (v: any) => (v == null ? '—' : format ? format(v) : String(v));
  const oldDisplay = display(oldValue);
  const newDisplay = display(newValue);
  const changed = oldDisplay !== newDisplay;

  // Hide rows where neither version has the field at all (keeps the table relevant
  // to the data actually present on these version records).
  if (oldValue == null && newValue == null) return null;

  return (
    <div className="flex items-start gap-3 py-1.5 text-xs">
      <span className="w-24 shrink-0 font-semibold text-text-muted">{label}</span>
      <span className={`flex-1 min-w-0 truncate ${changed ? 'text-red-400 line-through' : 'text-text-primary'}`}>{oldDisplay}</span>
      <span className={`flex-1 min-w-0 truncate ${changed ? 'text-accent-green font-semibold' : 'text-text-primary'}`}>{newDisplay}</span>
    </div>
  );
}

export default function VersionDiffModal({ isOpen, onClose, oldVersion, newVersion }: VersionDiffModalProps) {
  const [activeTab, setActiveTab] = useState<'diff' | 'raw'>('diff');

  // useMemo must be called unconditionally (before any early return).
  const oldText = useMemo(() => getPlainText(oldVersion), [oldVersion]);
  const newText = useMemo(() => getPlainText(newVersion), [newVersion]);

  const wordDiff = useMemo(() => computeDiff(oldText, newText), [oldText, newText]);

  const rawDiffResult = useMemo(() => diffWords(oldText, newText), [oldText, newText]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-bg-surface border border-border rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Version Diff</h2>
            <p className="text-xs text-text-muted mt-1">
              Comparing v{oldVersion?.versionNumber} to v{newVersion?.versionNumber || 'Current'}
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 border-b border-border bg-bg-elevated">
          {(['diff', 'raw'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors ${
                activeTab === tab
                  ? 'bg-bg-surface text-accent-light border border-border border-b-bg-surface'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              aria-pressed={activeTab === tab}
            >
              {tab === 'diff' ? 'Diff view' : 'Raw'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-bg-primary custom-scrollbar">
          {/* Metadata that changed between versions */}
          <div className="mb-4 pb-4 border-b border-border">
            <div className="flex items-center gap-3 mb-2 text-xs font-bold text-text-muted uppercase tracking-wider">
              <span className="w-24 shrink-0">Field</span>
              <span className="flex-1">Version {oldVersion?.versionNumber ?? '—'}</span>
              <span className="flex-1">Version {newVersion?.versionNumber ?? 'Current'}</span>
            </div>
            {META_FIELDS.map(({ key, label, format }) => (
              <MetaRow
                key={key}
                label={label}
                oldValue={getMetaValue(oldVersion, key)}
                newValue={getMetaValue(newVersion, key)}
                format={format}
              />
            ))}
          </div>

          {/* Two-column version header */}
          <div className="flex gap-6 mb-3 text-sm font-bold text-text-primary">
            <span className="flex-1">Version {oldVersion?.versionNumber ?? '—'}</span>
            <span className="flex-1">Version {newVersion?.versionNumber ?? 'Current'}</span>
          </div>

          {activeTab === 'diff' ? (
            <pre
              className="whitespace-pre-wrap break-words rounded-lg bg-bg-surface border border-border p-4 custom-scrollbar"
              style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.6, maxHeight: '60vh', overflowY: 'auto' }}
            >
              {wordDiff}
            </pre>
          ) : (
            <pre
              className="whitespace-pre-wrap break-words rounded-lg bg-bg-surface border border-border p-4 custom-scrollbar font-mono text-sm leading-relaxed"
              style={{ maxHeight: '60vh', overflowY: 'auto' }}
            >
              {rawDiffResult.map((part: Change, index: number) => {
                const color = part.added ? 'bg-green-500/20 text-green-400' : part.removed ? 'bg-red-500/20 text-red-400 line-through' : 'text-text-primary';
                return (
                  <span key={index} className={`rounded px-0.5 ${color}`}>
                    {part.value}
                  </span>
                );
              })}
            </pre>
          )}
        </div>

        <div className="p-4 border-t border-border bg-bg-elevated flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-bg-surface border border-border rounded-lg text-sm font-semibold text-text-primary hover:bg-bg-primary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
