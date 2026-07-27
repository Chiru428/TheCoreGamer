'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Gamepad2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Article } from '@/types';
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS } from '@/lib/constants';
import { contentTypePath } from '@/lib/seo';

interface HomeListCardProps {
  article: Article;
  titleClassName?: string;
}

export default function HomeListCard({ article, titleClassName }: HomeListCardProps) {
  const tc = CONTENT_TYPE_COLORS[article.contentType] || { bg: 'var(--accent)', color: '#fff' };
  const href = `/${contentTypePath(article.contentType)}/${article.slug}`;

  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
    >
      <div className="flex-1 min-w-0">
        <span
          className="mb-1 inline-block"
          style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: tc.textColor || tc.bg }}
        >
          {CONTENT_TYPE_LABELS[article.contentType] || article.contentType}
        </span>
        <h3
          className={`post-card-title font-bold text-gray-900 dark:text-white uppercase leading-[1.2] transition-colors group-hover:underline ${titleClassName || '!text-[16px]'}`}
          style={{ fontFamily: "'Rubik', sans-serif" }}
        >
          {article.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-text-muted mt-1.5">
          {article.author?.displayName && (
            <span className="text-[#00e5a0] font-bold">{article.author.displayName}</span>
          )}
          <span>{formatDate(article.publishedAt || article.createdAt)}</span>
        </div>
      </div>

      <div className="relative h-20 aspect-video shrink-0 overflow-hidden bg-[var(--deep,#0d0d1a)]">
        {article.featuredImageUrl ? (
          <Image
            src={article.featuredImageUrl}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-1000 ease-out"
            sizes="(max-width: 1024px) 112px, 128px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 opacity-30" />
          </div>
        )}
      </div>
    </Link>
  );
}
