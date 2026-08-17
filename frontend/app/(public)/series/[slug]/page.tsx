import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { fetchPublicSeries } from '@/lib/api';
import { buildMeta } from '@/lib/seo';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { formatDate, readingTime } from '@/lib/utils';
import { SITE_URL } from '@/lib/constants';

export const revalidate = 600;

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const res = await fetchPublicSeries(slug, 600);
  if (!res.success || !res.data) return {};
  const s = res.data;
  return buildMeta({
    title: `${s.name} — ${s.entries.length}-Part Series | TheCoreGamer`,
    description: s.description || `Read all ${s.entries.length} parts of the "${s.name}" series on TheCoreGamer.`,
    image: s.coverImageUrl || undefined,
    url: `/series/${slug}`,
  });
}

export default async function SeriesHubPage({ params }: Props) {
  const { slug } = await params;
  const res = await fetchPublicSeries(slug, 600);
  if (!res.success || !res.data) notFound();
  const series = res.data;

  return (
    <div className="w-full">
      {/* Hero */}
      <div style={{ position: 'relative', width: '100%', minHeight: 280, overflow: 'hidden', marginBottom: 48 }}>
        {series.coverImageUrl ? (
          <Image quality={100}
            src={series.coverImageUrl}
            alt={series.name}
            fill
            style={{ objectFit: 'cover', objectPosition: 'center' }}
            unoptimized
            priority
            sizes="100vw"
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0f1729 0%, #1a0a2e 100%)' }} />
        )}
        {/* Overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, rgba(10,10,20,0.95) 35%, rgba(10,10,20,0.65) 70%, rgba(10,10,20,0.4))',
        }} />

        <div style={{
          position: 'relative', zIndex: 1,
          maxWidth: 1024, margin: '0 auto', padding: '32px 24px 40px',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 280,
        }}>
          <BreadcrumbNav crumbs={[{ label: 'Series', href: '/series' }, { label: series.name }]} />

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <BookOpen size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                Article Series
              </span>
              {series.isComplete && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '2px 8px', borderRadius: 20,
                  background: 'rgba(34,197,94,0.15)', color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.3)',
                }}>
                  <CheckCircle size={10} /> Complete
                </span>
              )}
            </div>
            <h1 style={{
              margin: 0, fontSize: 'clamp(28px, 5vw, 48px)',
              fontWeight: 900, color: 'var(--text)', lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}>
              {series.name}
            </h1>
            {series.description && (
              <p style={{ margin: '10px 0 0', fontSize: 15, color: 'rgba(255,255,255,0.65)', maxWidth: 600, lineHeight: 1.6 }}>
                {series.description}
              </p>
            )}
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
              {series.entries.length} part{series.entries.length !== 1 ? 's' : ''}
              {series.author && <> &nbsp;·&nbsp; by {series.author.displayName}</>}
            </div>
          </div>
        </div>
      </div>

      {/* Parts List */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px 80px' }}>
        <h2 style={{
          margin: '0 0 24px', fontSize: 11, fontWeight: 800, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--muted)',
        }}>
          All Parts
        </h2>

        {series.entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
            No published parts yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {series.entries.map((entry) => {
              const art = entry.article;
              if (!art) return null;
              return (
                <Link
                  key={entry.id}
                  href={`/articles/${art.slug}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '16px 20px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--bg2)',
                    textDecoration: 'none',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.background = 'var(--bg3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--bg2)';
                  }}
                >
                  {/* Part number badge */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--accent)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff',
                  }}>
                    {entry.position}
                  </div>

                  {/* Thumbnail */}
                  {art.featuredImageUrl && (
                    <div style={{
                      width: 80, height: 54, borderRadius: 6, overflow: 'hidden',
                      flexShrink: 0, position: 'relative', border: '1px solid var(--border)',
                    }}>
                      <Image quality={100}
                        src={art.featuredImageUrl}
                        alt={art.title}
                        fill
                        style={{ objectFit: 'cover' }}
                        unoptimized
                        sizes="80px"
                      />
                    </div>
                  )}

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)',
                      lineHeight: 1.3, overflow: 'hidden',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {entry.displayTitle || art.title}
                    </h3>
                    {art.excerpt && (
                      <p style={{
                        margin: '4px 0 0', fontSize: 12, color: 'var(--muted)',
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                      }}>
                        {art.excerpt}
                      </p>
                    )}
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                      {art.publishedAt && (
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate(art.publishedAt)}</span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowRight size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                </Link>
              );
            })}
          </div>
        )}

        {/* Start Reading CTA */}
        {series.entries.length > 0 && series.entries[0].article && (
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <Link
              href={`/articles/${series.entries[0].article.slug}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 28px', borderRadius: 10,
                background: 'var(--accent)', color: '#fff',
                textDecoration: 'none', fontWeight: 700, fontSize: 14,
                letterSpacing: '0.04em',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Start Reading — Part 1 <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
