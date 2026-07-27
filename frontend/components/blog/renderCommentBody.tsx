'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useProfileModalStore } from '@/store/profileModalStore';

// Order matters: bold (**) before italic (*) so "**x**" isn't first consumed as italic.
const MARKDOWN_REGEX =
  /\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|~~(.+?)~~|\|\|(.+?)\|\||>>(.+?)<<|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|@([a-zA-Z0-9_]+)/g;

function SpoilerSpan({ children }: { children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      onClick={() => setRevealed(true)}
      title={revealed ? undefined : 'Spoiler — click to reveal'}
      className={cn(
        'rounded px-0.5 cursor-pointer transition-colors select-none',
        revealed ? 'bg-transparent' : 'bg-text-primary text-text-primary'
      )}
    >
      {children}
    </span>
  );
}

/** Renders inline markdown produced by the comment toolbar (bold, italic, underline,
 * strikethrough, spoiler, quote, code, links) and @mentions in a comment body. */
export function renderCommentBody(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(MARKDOWN_REGEX)) {
    const index = match.index ?? 0;
    if (index > lastIndex) nodes.push(text.slice(lastIndex, index));

    const [full, bold, italic, underline, strike, spoiler, quote, code, linkText, linkUrl, mention] = match;
    if (bold !== undefined) {
      nodes.push(<strong key={key++}>{bold}</strong>);
    } else if (italic !== undefined) {
      nodes.push(<em key={key++}>{italic}</em>);
    } else if (underline !== undefined) {
      nodes.push(<u key={key++}>{underline}</u>);
    } else if (strike !== undefined) {
      nodes.push(<s key={key++}>{strike}</s>);
    } else if (spoiler !== undefined) {
      nodes.push(<SpoilerSpan key={key++}>{spoiler}</SpoilerSpan>);
    } else if (quote !== undefined) {
      nodes.push(
        <span key={key++} className="inline-block border-l-2 border-border pl-2 text-text-muted italic">
          {quote}
        </span>
      );
    } else if (code !== undefined) {
      nodes.push(
        <code key={key++} className="px-1 py-0.5 rounded bg-bg-surface text-[0.9em]">
          {code}
        </code>
      );
    } else if (linkText !== undefined && linkUrl !== undefined) {
      nodes.push(
        <a key={key++} href={linkUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">
          {linkText}
        </a>
      );
    } else if (mention !== undefined) {
      nodes.push(
        <button
          key={key++}
          type="button"
          onClick={() => useProfileModalStore.getState().openProfile(mention)}
          className="font-medium hover:underline"
          style={{ color: 'var(--accent)', background: 'var(--accent-dim)', borderRadius: '3px', padding: '0 2px' }}
        >
          @{mention}
        </button>
      );
    }

    lastIndex = index + full.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}
