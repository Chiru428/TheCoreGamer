'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Tag } from '@/types';

function TagPill({ tag }: { tag: Tag }) {
  const [hover, setHover] = useState(false);
  const color = tag.color || 'var(--accent, #00e5a0)';
  
  return (
    <Link
      href={`/tags/${tag.slug}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex px-3 py-1.5 md:px-4 md:py-2 text-[12px] md:text-[13px] font-bold uppercase tracking-[0.5px] rounded-full border transition-colors duration-200 no-underline"
      style={{
        backgroundColor: hover ? color : 'transparent',
        borderColor: hover ? color : 'var(--border)',
        color: hover ? '#fff' : 'var(--text)',
      }}
    >
      {tag.name}
    </Link>
  );
}

interface PopularTagsBoxProps {
  title?: string;
  tags: Tag[];
}

export default function PopularTagsBox({ title = "Popular Tags", tags }: PopularTagsBoxProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="tags-sidebar hidden md:block w-full">
      <div className="tags-box">
        <div className="tags-header">
          <span className="section-title-bar !text-[24px] md:!text-[28px]">{title}</span>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3 pt-5">
          {tags.map((tag) => (
            <TagPill key={tag.slug} tag={tag} />
          ))}
        </div>
      </div>
      <style jsx>{`
        .tags-sidebar {
          background: var(--bg2);
          padding: 20px 28px 28px;
        }
        .tags-sidebar :global(.section-title-bar) {
          font-family: "Gibson", sans-serif !important;
          font-size: 24px !important;
          line-height: 1.2 !important;
          font-weight: 700 !important;
        }
        @media (min-width: 768px) {
          .tags-sidebar :global(.section-title-bar) {
            font-size: 28px !important;
          }
        }
        .tags-sidebar :global(.section-title-bar::before) {
          display: none !important;
        }
        .tags-header {
          padding-bottom: 12px;
          border-bottom: 2px solid var(--accent, #00e5a0);
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
}
