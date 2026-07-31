import { notFound, redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { fetchPost } from '@/lib/api';
import { contentTypePath, buildArticleMeta } from '@/lib/seo';
import { formatDate, wordCount } from '@/lib/utils';
import ReadingProgress from '@/components/ui/ReadingProgress';
import ShareButtons from '@/components/ui/ShareButtons';
import ArticleBody from '@/components/blog/ArticleBody';
import ReadingManager from '@/components/blog/ReadingManager';
import ArticleLikeButton from '@/components/blog/ArticleLikeButton';
import ViewTracker from '@/components/blog/ViewTracker';
import AlgoliaEventTracker from '@/components/blog/AlgoliaEventTracker';
import AlgoliaRecommendations from '@/components/blog/AlgoliaRecommendations';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import ArticleByline from '@/components/blog/ArticleByline';
import LazySection from '@/components/ui/LazySection';
import FeaturedImage from '@/components/blog/FeaturedImage';

import AdSlot from '@/components/monetization/AdSlot';
import PollWidget from '@/components/blog/PollWidget';
import MuxPlayerEmbed from '@/components/ui/MuxPlayerEmbed';
import JsonLd from '@/components/seo/JsonLd';
import Badge from '@/components/ui/Badge';
import { Clock, Zap, Newspaper, Tag, Lightbulb, List, LayoutGrid, Gamepad2, BookOpen } from 'lucide-react';
import { SITE_URL } from '@/lib/constants';

import SaveToListDropdown from '@/components/public/lists/SaveToListDropdown';
import BookmarkButton from '@/components/blog/BookmarkButton';
import SeriesNav from '@/components/public/articles/SeriesNav';
import LiveBlogFeed from '@/components/public/articles/LiveBlogFeed';
import { fetchLiveUpdates } from '@/lib/api';
import type { LiveBlogUpdate } from '@/types';

const CommentSection = dynamic(() => import('@/components/blog/CommentSection'), {
  loading: () => <div className="mt-8 pt-8 border-t border-border space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="shimmer h-20" />)}</div>,
});

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const res = await fetchPost(slug, 60);
  if (!res.data) return {};
  return buildArticleMeta(res.data);
}

export default async function GenericArticlePage({ params, expectedPath }: { params: Promise<{ slug: string }>, expectedPath: string }) {
  const { slug } = await params;
  const res = await fetchPost(slug, 60);
  if (!res.data) notFound();
  const article = res.data;

  // Enforce canonical path to prevent duplicate content rendering under the wrong folder
  const canonicalPath = contentTypePath(article.contentType);
  if (canonicalPath !== expectedPath) {
    redirect(`/${canonicalPath}/${slug}`);
  }

  const wc = wordCount(article.content);

  const isLiveBlog = (article as any).isLiveBlog === true;
  let liveUpdates: LiveBlogUpdate[] = [];
  if (isLiveBlog) {
    const updatesRes = await fetchLiveUpdates(slug);
    liveUpdates = updatesRes.data || [];
  }

  return (
    <>
      <ReadingProgress slug={slug} />
      <ViewTracker slug={slug} />
      <AlgoliaEventTracker objectID={article.id} indexName="articles" />
      <JsonLd type="Article" data={{
        title: article.title,
        description: article.excerpt || '',
        image: article.featuredImageUrl,
        datePublished: article.publishedAt,
        dateModified: (article as any).lastMajorUpdateAt ?? article.updatedAt,
        authorName: article.author?.displayName,
        url: `${SITE_URL}/${expectedPath}/${slug}`,
        wordCount: wc,
        section: article.contentType,
      }} />
      <JsonLd type="BreadcrumbList" data={{ items: [
        { name: 'Home', url: '/' },
        ...(article.contentType === 'NEWS' ? [{ name: 'News', url: '/news' }] : 
           article.contentType === 'DEAL' ? [{ name: 'Deals', url: '/deals' }] :
           article.contentType === 'GUIDE' ? [{ name: 'Guides', url: '/guides' }] :
           article.contentType === 'OPINION' ? [{ name: 'Opinion', url: '/opinions' }] :
           article.contentType === 'FEATURE' ? [{ name: 'Features', url: '/features' }] :
           article.contentType === 'LISTICLE' ? [{ name: 'Lists', url: '/lists' }] :
           article.tags?.[0] ? [{ name: article.tags[0].tag.name, url: `/tags/${article.tags[0].tag.slug}` }] : []),
        { name: article.title, url: `/${expectedPath}/${slug}` },
      ]}} />
      {article.videoAssets && article.videoAssets.length > 0 && (
        <JsonLd type="VideoObject" data={{
          name: article.title,
          description: article.videoAssets[0].transcript?.slice(0, 200) || article.excerpt || '',
          thumbnailUrl: article.videoAssets[0].thumbnailUrl ?? article.featuredImageUrl,
          uploadDate: new Date(article.videoAssets[0].createdAt).toISOString(),
          duration: article.videoAssets[0].duration ?? undefined,
          contentUrl: `https://stream.mux.com/${article.videoAssets[0].muxPlaybackId}.m3u8`,
          embedUrl: `${SITE_URL}/${expectedPath}/${slug}`,
        }} />
      )}

      <article className="max-w-[1280px] mx-auto px-4 lg:px-0 py-6 relative">
        <div className="max-w-[945.6px]">
        <div className="flex flex-col xl:flex-row gap-8 xl:gap-12">
          {/* Main Content Column */}
          <div className="flex-1 min-w-0">

            <div
              className="flex flex-col lg:flex-row gap-8"
              style={{ width: 'calc(100% + max(0px, min(100vw, 1280px) - 945.6px))' }}
            >
              <div className="w-full lg:w-[849.6px] lg:shrink-0 lg:border-r lg:border-border lg:pr-8">
                {/* Hero */}
                <div className="mt-1 md:mt-2 mb-3 md:mb-6">
                  {/* FTC disclosure — must be clear and conspicuous, not buried in fine print */}
                  {article.isSponsored && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 16px', marginBottom: '20px',
                      background: 'rgba(245,158,11,0.08)',
                      border: '1px solid rgba(245,158,11,0.25)',
                      borderLeft: '4px solid #f59e0b',
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: '#f59e0b', flexShrink: 0 }}>
                        Sponsored
                      </span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                        This content is a paid partnership
                        {article.sponsorName ? ` with ${article.sponsorName}` : ''}.
                        Our editorial standards apply.
                      </span>
                      <a href="/affiliate-disclosure" style={{ fontSize: '11px', color: '#f59e0b',
                        textDecoration: 'underline', marginLeft: 'auto', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        Disclosure
                      </a>
                    </div>
                  )}
                  {article.isBreaking && (
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge variant="danger" className="text-[10px] md:text-xs"><Zap className="w-3 h-3 mr-1" />Breaking</Badge>
                    </div>
                  )}
                  <div className="mb-4">
                    <BreadcrumbNav crumbs={[
                      { label: article.contentType === 'NEWS' ? 'News' : 
                               article.contentType === 'DEAL' ? 'Deals' :
                               article.contentType === 'GUIDE' ? 'Guides' :
                               article.contentType === 'OPINION' ? 'Opinions' :
                               article.contentType === 'FEATURE' ? 'Features' :
                               article.contentType === 'LISTICLE' ? 'Lists' : 'Articles',
                        href: `/${expectedPath}`,
                        icon: article.contentType === 'NEWS' ? <Newspaper className="w-4.5 h-4.5" /> : 
                              article.contentType === 'DEAL' ? <Tag className="w-4.5 h-4.5" /> :
                              article.contentType === 'GUIDE' ? <BookOpen className="w-4.5 h-4.5" /> :
                              article.contentType === 'OPINION' ? <Lightbulb className="w-4.5 h-4.5" /> :
                              article.contentType === 'FEATURE' ? <LayoutGrid className="w-4.5 h-4.5" /> :
                              article.contentType === 'LISTICLE' ? <List className="w-4.5 h-4.5" /> : <LayoutGrid className="w-4.5 h-4.5" /> }
                    ]} />
                  </div>
                  <h1
                    className="font-sans text-[26px] md:text-[48px] font-bold text-text-primary mb-3 leading-tight text-left underline"
                  >
                    {article.title}
                  </h1>

                  {article.featuredImageUrl && (
                    <FeaturedImage 
                      src={article.featuredImageUrl} 
                      alt={`Featured image for ${article.title}`} 
                      credit={article.featuredImageCredit} 
                      priority={true} 
                    />
                  )}
                </div>


              <ArticleByline
                authorName={article.author?.displayName || 'Unknown'}
                authorUsername={article.author?.username}
                publishedAt={article.publishedAt || article.createdAt}
                commentCount={article._count?.comments ?? 0}
                title={article.title}
                url={`/${expectedPath}/${slug}`}
                articleId={article.id}
              />


              {/* Major Update Banner */}
              {(article as any).lastMajorUpdateAt && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 12px', borderRadius: 20,
                  background: 'var(--accent-dim, rgba(99,102,241,0.12))',
                  color: 'var(--accent)', fontSize: 12, fontWeight: 600,
                  marginBottom: 16, border: '1px solid var(--accent-dim, rgba(99,102,241,0.2))',
                }}>
                  <Clock className="w-3 h-3" style={{ flexShrink: 0 }} />
                  <span>Updated {formatDate((article as any).lastMajorUpdateAt)}</span>
                  {(article as any).lastMajorUpdateNote && (
                    <span style={{ opacity: 0.8 }}>— {(article as any).lastMajorUpdateNote}</span>
                  )}
                </div>
              )}

            {/* Content Body */}
            <div id="article-content" className="w-full">
              {isLiveBlog && (
                <LiveBlogFeed
                  articleSlug={slug}
                  initialUpdates={liveUpdates}
                  isEnded={!!(article as any).liveBlogEndedAt}
                  liveBlogEndedAt={(article as any).liveBlogEndedAt}
                />
              )}
              {article.videoAssets && article.videoAssets.length > 0 && (
                <MuxPlayerEmbed
                  playbackId={article.videoAssets[0].muxPlaybackId}
                  title={article.videoAssets[0].title || article.title}
                  aspectRatio={article.videoAssets[0].aspectRatio}
                  videoAssetId={article.videoAssets[0].id}
                />
              )}
              <ReadingManager slug={slug} wordCount={wc} />
              <div className="-mx-5 md:mx-0">
                <ArticleBody
                  content={(article.contentType === 'GUIDE' && article.guideType === 'Mod Guide') ? (article.modGuide?.sections || []) : article.content}
                  slug={slug}
                />
              </div>

              {article.polls && article.polls.length > 0 && (
                <div className="space-y-4 mt-8 lg:hidden">
                  {article.polls.map(poll => <PollWidget key={poll.id} pollId={poll.id} />)}
                </div>
              )}

              {/* Related Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="mt-8">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">Related Tags</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {article.tags.map(({ tag }) => (
                      <Link
                        key={tag.id}
                        href={`/tags/${tag.slug}`}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold text-text-primary bg-bg-elevated border border-border hover:border-[var(--brand-green)] hover:text-[var(--brand-green)] transition-colors"
                      >
                        {tag.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-row flex-wrap items-center justify-start md:justify-between gap-4 mt-6 pt-6 border-t border-border mb-6">
                <ShareButtons title={article.title} url={`/${expectedPath}/${slug}`} />
                <div className="flex items-center gap-4 md:gap-2">
                  <ArticleLikeButton articleId={article.id} initialCount={article._count?.reactions ?? 0} />
                  <BookmarkButton articleId={article.id} />
                  <SaveToListDropdown articleId={article.id} />
                </div>
              </div>

              {(article as any).seriesEntry && (
                <SeriesNav
                  series={(article as any).seriesEntry.series}
                  position={(article as any).seriesEntry.position}
                  totalParts={(article as any).seriesEntry.totalParts}
                  prev={(article as any).seriesEntry.prev}
                  next={(article as any).seriesEntry.next}
                  parentContentType={article.contentType}
                />
              )}
              <div className="w-full flex justify-center mt-8 mb-8">
                <AdSlot slot="ADS-02" className="w-full max-w-[728px]" />
              </div>
              <CommentSection articleId={article.id} />
            </div>
            </div>

              <aside className="w-full lg:flex-1 flex flex-col">
                <hr className="border-border lg:hidden w-full" />
                {article.polls && article.polls.length > 0 && (
                  <div className="space-y-4 mb-8 hidden lg:block">
                    {article.polls.map(poll => <PollWidget key={poll.id} pollId={poll.id} />)}
                  </div>
                )}
                
                <div className="w-full hidden lg:block">
                  <div className="sticky top-24 w-full z-10">
                    <AdSlot slot="ADS-07" />
                  </div>
                  <div className="h-[1000px]" />
                </div>
                {/* B6 — Lazy-render related posts to keep initial paint fast */}
                <div className="w-full">
                  <LazySection minHeight="200px">
                    <AlgoliaRecommendations objectID={article.id} indexName="articles" model="related-products" title="You May Also Like" max={8} layout="sidebar" titleClassName="text-[20px] w-full justify-center" staticBadges className="mt-6" />
                  </LazySection>
                </div>
                <div className="mt-8 flex-1 w-full hidden lg:block">
                  <div className="sticky top-24 z-10">
                    <AdSlot slot="ADS-06" />
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
        </div>
      </article>
    </>
  );
}
