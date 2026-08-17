import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, CheckCircle, ArrowRight } from 'lucide-react';
import { fetchAllPublicSeries } from '@/lib/api';
import type { SeriesSummary } from '@/lib/api';
import { buildMeta } from '@/lib/seo';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';

export const revalidate = 600;

export async function generateMetadata() {
  return buildMeta({
    title: 'Article Series | TheCoreGamer',
    description: 'Browse all multi-part article series on TheCoreGamer — in-depth guides, opinion pieces, and more.',
    url: '/series',
  });
}

export default async function SeriesIndexPage() {
  const res = await fetchAllPublicSeries();
  const published: SeriesSummary[] = (res.success && res.data) ? res.data : [];

  return (
    <div className="w-full max-w-[1024px] mx-auto px-4 md:px-6 py-10">
      <BreadcrumbNav crumbs={[{ label: 'Series' }]} />

      <div style={{ margin: '24px 0 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BookOpen size={22} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Article Series
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            Multi-part deep dives, guides, and story arcs
          </p>
        </div>
      </div>

      {published.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--muted)' }}>
          No series published yet. Check back soon!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {published.map((series) => (
            <SeriesCard key={series.id} series={series} />
          ))}
        </div>
      )}
    </div>
  );
}

function SeriesCard({ series }: { series: SeriesSummary }) {
  return (
    <Link
      href={`/series/${series.slug}`}
      style={{
        display: 'block',
        borderRadius: 12,
        border: '1px solid var(--border)',
        overflow: 'hidden',
        background: 'var(--bg2)',
        textDecoration: 'none',
        transition: 'border-color 0.15s, transform 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Cover image */}
      <div style={{ position: 'relative', aspectRatio: '16/7', background: 'var(--bg3)', overflow: 'hidden' }}>
        {series.coverImageUrl ? (
          <Image quality={100}
            src={series.coverImageUrl}
            alt={series.name}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, #0f1729 0%, #1a0a2e 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen size={32} style={{ color: 'var(--accent)', opacity: 0.3 }} />
          </div>
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)',
        }} />
        {series.isComplete && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '3px 8px', borderRadius: 20,
            background: 'rgba(34,197,94,0.2)', color: '#22c55e',
            border: '1px solid rgba(34,197,94,0.4)', backdropFilter: 'blur(4px)',
          }}>
            <CheckCircle size={9} /> Complete
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--accent)', marginBottom: 6,
        }}>
          {series.articleCount} part{series.articleCount !== 1 ? 's' : ''}
          {series.authorName && <> &nbsp;·&nbsp; {series.authorName}</>}
        </div>
        <h2 style={{
          margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)',
          lineHeight: 1.3, overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {series.name}
        </h2>
        {series.description && (
          <p style={{
            margin: '7px 0 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {series.description}
          </p>
        )}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>
          Read Series <ArrowRight size={12} />
        </div>
      </div>
    </Link>
  );
}
