'use client';

import Link from 'next/link';
import { FileText, Gamepad2, Tag as TagIcon } from 'lucide-react';
import { CONTENT_TYPE_LABELS } from '@/lib/constants';
import { contentTypePath } from '@/lib/seo';
import Badge from '@/components/ui/Badge';
import type { AutocompleteResult } from '@/types';

interface Props { results: AutocompleteResult[]; onSelect: () => void; }

const SECTION_ORDER: { type: AutocompleteResult['type']; label: string }[] = [
  { type: 'ARTICLE', label: 'Articles' },
  { type: 'GAME', label: 'Games' },
  { type: 'TAG', label: 'Tags' },
];

function hrefFor(r: AutocompleteResult) {
  if (r.type === 'TAG') return `/tags/${r.slug}`;
  if (r.type === 'GAME') return `/games/${r.slug}`;
  return `/${contentTypePath(r.contentType)}/${r.slug}`;
}

function IconFor({ type }: { type: AutocompleteResult['type'] }) {
  if (type === 'TAG') return <TagIcon className="w-4 h-4 text-text-dim shrink-0" />;
  if (type === 'GAME') return <Gamepad2 className="w-4 h-4 text-text-dim shrink-0" />;
  return <FileText className="w-4 h-4 text-text-dim shrink-0" />;
}

export default function SearchAutocomplete({ results, onSelect }: Props) {
  if (!results.length) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
      {SECTION_ORDER.map(({ type, label }) => {
        const items = results.filter(r => r.type === type);
        if (!items.length) return null;
        return (
          <div key={type}>
            <p className="px-4 pt-3 pb-1 text-xs font-semibold text-text-dim uppercase tracking-wide">{label}</p>
            {items.map(r => (
              <Link
                key={`${r.type}-${r.id}`}
                href={hrefFor(r)}
                onClick={onSelect}
                className="flex items-center gap-3 px-4 py-3 hover:bg-bg-elevated transition-colors border-b border-border last:border-0"
              >
                <IconFor type={r.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{r.title ?? r.name}</p>
                </div>
                {r.type === 'ARTICLE' && r.contentType && (
                  <Badge size="sm">{CONTENT_TYPE_LABELS[r.contentType] ?? r.contentType}</Badge>
                )}
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}
