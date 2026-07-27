'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, ChevronLeft, ChevronRight, LayoutList } from 'lucide-react';
import { contentTypePath } from '@/lib/seo';

interface ArticleRef {
  id: string;
  title: string;
  slug: string;
  featuredImageUrl: string | null;
  position: number;
}

interface SeriesNavProps {
  series: { name: string; slug: string };
  position: number;
  totalParts: number;
  prev: ArticleRef | null;
  next: ArticleRef | null;
  parentContentType?: string;
}

export default function SeriesNav({ series, position, totalParts, prev, next, parentContentType }: SeriesNavProps) {
  return (
    <div style={{
      margin: '32px 0',
      borderRadius: 12,
      border: '1px solid var(--border)',
      borderLeft: '4px solid var(--accent)',
      background: 'var(--bg2)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BookOpen size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div>
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--muted)',
            }}>
              Part {position} of {totalParts} &mdash;&nbsp;
            </span>
            <Link
              href={`/series/${series.slug}`}
              style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}
            >
              {series.name}
            </Link>
          </div>
        </div>
        <Link
          href={`/series/${series.slug}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 700, color: 'var(--muted)',
            textDecoration: 'none', letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          <LayoutList size={12} /> View Full Series
        </Link>
      </div>

      {/* Prev / Next Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1,
        background: 'var(--border)',
      }}>
        {/* PREVIOUS */}
        <NavCard
          label="Previous"
          icon={<ChevronLeft size={14} />}
          article={prev}
          side="prev"
          parentContentType={parentContentType}
        />

        {/* NEXT */}
        <NavCard
          label="Next"
          icon={<ChevronRight size={14} />}
          article={next}
          side="next"
          parentContentType={parentContentType}
        />
      </div>
    </div>
  );
}

function NavCard({
  label, icon, article, side, parentContentType,
}: {
  label: string;
  icon: React.ReactNode;
  article: ArticleRef | null;
  side: 'prev' | 'next';
  parentContentType?: string;
}) {
  const isNext = side === 'next';

  if (!article) {
    return (
      <div style={{
        padding: '16px 18px',
        background: 'var(--bg2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        opacity: 0.4,
      }}>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--muted)',
          display: 'flex', alignItems: 'center', gap: 4,
          justifyContent: isNext ? 'flex-end' : 'flex-start',
        }}>
          {!isNext && icon}{label}{isNext && icon}
        </span>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', textAlign: isNext ? 'right' : 'left' }}>
          {isNext ? "You're at the latest part" : 'This is the first part'}
        </p>
      </div>
    );
  }

  return (
    <Link
      href={`/${contentTypePath(parentContentType)}/${article.slug}`}
      style={{
        padding: '14px 18px',
        background: 'var(--bg2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        textDecoration: 'none',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg3)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg2)')}
    >
      <span style={{
        fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: isNext ? 'var(--accent)' : 'var(--muted)',
        display: 'flex', alignItems: 'center', gap: 4,
        justifyContent: isNext ? 'flex-end' : 'flex-start',
      }}>
        {!isNext && icon}{label}{isNext && icon}
      </span>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexDirection: isNext ? 'row-reverse' : 'row',
      }}>
        {article.featuredImageUrl && (
          <div style={{
            width: 60, height: 40, borderRadius: 5,
            overflow: 'hidden', flexShrink: 0, position: 'relative',
            border: '1px solid var(--border)',
          }}>
            <Image
              src={article.featuredImageUrl}
              alt={article.title}
              fill
              style={{ objectFit: 'cover' }}
              unoptimized
            />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10, color: 'var(--muted)', fontWeight: 700, marginBottom: 3,
            textAlign: isNext ? 'right' : 'left',
          }}>
            Part {article.position}
          </div>
          <p style={{
            margin: 0, fontSize: 12, fontWeight: 600,
            color: 'var(--text)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.35,
            textAlign: isNext ? 'right' : 'left',
          }}>
            {article.title}
          </p>
        </div>
      </div>
    </Link>
  );
}
