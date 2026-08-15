import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { fetchReview } from '@/lib/api';
import { buildArticleMeta } from '@/lib/seo';
import { formatDate, wordCount, getScoreColor, getScoreLabel } from '@/lib/utils';
import ReadingProgress from '@/components/ui/ReadingProgress';
import ShareButtons from '@/components/ui/ShareButtons';
import ArticleBody from '@/components/blog/ArticleBody';
import ReadingManager from '@/components/blog/ReadingManager';
import ArticleLikeButton from '@/components/blog/ArticleLikeButton';
import ViewTracker from '@/components/blog/ViewTracker';
import AlgoliaEventTracker from '@/components/blog/AlgoliaEventTracker';
import AlgoliaRecommendations from '@/components/blog/AlgoliaRecommendations';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import FeaturedImage from '@/components/blog/FeaturedImage';

import ArticleByline from '@/components/blog/ArticleByline';
import ScoreBadge from '@/components/review/ScoreBadge';
import VerdictBlock from '@/components/review/VerdictBlock';
import ScoreHistorySection from '@/components/review/ScoreHistorySection';
import AdSlot from '@/components/monetization/AdSlot';
import AffiliateBox from '@/components/monetization/AffiliateBox';
import PollWidget from '@/components/blog/PollWidget';
import MuxPlayerEmbed from '@/components/ui/MuxPlayerEmbed';
import JsonLd from '@/components/seo/JsonLd';
import Badge from '@/components/ui/Badge';
import LazySection from '@/components/ui/LazySection';
import SaveToListDropdown from '@/components/public/lists/SaveToListDropdown';
import BookmarkButton from '@/components/blog/BookmarkButton';
import { AlertTriangle, Zap, Gamepad2, Star } from 'lucide-react';
import { SITE_URL } from '@/lib/constants';


const CommentSection = dynamic(() => import('@/components/blog/CommentSection'), {
  loading: () => <div className="mt-8 pt-8 border-t border-border space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="shimmer h-20" />)}</div>,
});

export const revalidate = 60;

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const res = await fetchReview(slug, 60);
  if (!res.data) return {};
  return buildArticleMeta({ ...res.data, slug });
}

export default async function ReviewDetailPage({ params }: Props) {
  const { slug } = await params;
  const res = await fetchReview(slug, 60);
  if (!res.data) notFound();
  const article = res.data;
  const review = article.gameReview;
  const wc = wordCount(article.content);

  return (
    <>
      <ReadingProgress slug={slug} />
      <ViewTracker slug={slug} />
      <AlgoliaEventTracker objectID={article.id} indexName="articles" />
      <article className="max-w-[1280px] mx-auto px-4 lg:px-0 pt-0 pb-6 md:pt-3 relative">
        <div className="max-w-[945.6px]">
        <JsonLd type="BreadcrumbList" data={{ items: [
          { name: 'Home', url: '/' },
          { name: 'Reviews', url: '/reviews' },
          { name: article.title, url: `/reviews/${slug}` },
        ]}} />
        {review && (
          <JsonLd type="Review" data={{
            gameTitle: review.gameTitle,
            score: Number(review.reviewScore),
            verdict: review.verdict,
            platforms: review.platforms,
            genres: review.genres,
            developer: review.developer,
            publisher: review.publisher,
            releaseDate: review.releaseDate,
            authorName: article.author?.displayName,
            datePublished: article.publishedAt,
            dateModified: article.updatedAt,
            url: `${SITE_URL}/reviews/${slug}`,
          }} />
        )}
        {article.videoAssets && article.videoAssets.length > 0 && (
          <JsonLd type="VideoObject" data={{
            name: article.title,
            description: article.videoAssets[0].transcript?.slice(0, 200) || article.excerpt || '',
            thumbnailUrl: article.videoAssets[0].thumbnailUrl ?? article.featuredImageUrl,
            uploadDate: new Date(article.videoAssets[0].createdAt).toISOString(),
            duration: article.videoAssets[0].duration ?? undefined,
            contentUrl: `https://stream.mux.com/${article.videoAssets[0].muxPlaybackId}.m3u8`,
            embedUrl: `${SITE_URL}/reviews/${slug}`,
          }} />
        )}
        </div>

        {/* Full-width featured image — lives here at the max-w-[1280px] article level so it
            naturally spans the full 1280px without any bleed tricks */}
        {article.featuredImageUrl && (
          <div className="w-full">
            <FeaturedImage
              src={article.featuredImageUrl}
              alt={`Featured image for ${article.title}`}
              credit={null}
              priority={true}
            />
            {/* Credit + Reviewed-on row */}
            {(article.featuredImageCredit || (review && (review.platformsTested?.length ?? 0) > 0) || (review?.copyProvidedByPublisher)) && (
              <div className="flex items-center justify-between gap-4 mt-1 mb-[6px] px-4 lg:px-0">
                <p className="text-[11px] text-text-dim">
                  {article.featuredImageCredit ? `© ${article.featuredImageCredit}` : ''}
                </p>
                <p className="text-[11px] text-text-dim text-right">
                  {review && (review.platformsTested?.length ?? 0) > 0 && (
                    <span>Reviewed on: {review.platformsTested!.join(', ')}.</span>
                  )}
                  {review?.copyProvidedByPublisher && (
                    <span className="ml-1">Review copy provided by publisher.</span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="max-w-[945.6px] lg:pl-[68px] relative">

          {/* Sticky left-gap action bar — hidden on mobile, only renders at lg+ */}
          <div className="hidden lg:flex flex-col absolute left-0 top-0 bottom-[1000px] w-[44px] pt-4">
            <div className="sticky top-24 flex flex-col bg-black/10 dark:bg-white/10 gap-[1px]">
              <ArticleLikeButton articleId={article.id} initialCount={article._count?.reactions ?? 0} hideCount={true} variant="sidebar" />
              <a
                href="#comments"
                className="flex items-center justify-center w-[44px] h-[44px] transition-colors text-text-muted bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 hover:text-text-primary"
                aria-label="Jump to comments"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </a>
              <BookmarkButton articleId={article.id} variant="sidebar" />
            </div>
          </div>

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
                  <div className="mb-2">
                    <BreadcrumbNav crumbs={[
                      { label: 'Reviews', href: '/reviews', icon: <Star className="w-4.5 h-4.5" /> }
                    ]} />
                  </div>
                  <h1
                    className="font-sans text-[26px] md:text-[36px] font-bold text-text-primary mb-3 leading-tight text-left"
                  >
                    {article.title}
                  </h1>


                </div>

              {/* Byline — no bottom border on reviews */}
              <div className="[&>div]:border-b-0 [&>div]:pb-0 [&>div]:mb-2 md:[&>div]:mb-4">
                <ArticleByline
                  authorName={article.author?.displayName || 'Unknown'}
                  authorUsername={article.author?.username}
                  publishedAt={article.publishedAt || article.createdAt}
                  commentCount={article._count?.comments ?? 0}
                  title={article.title}
                  url={`/reviews/${slug}`}
                  articleId={article.id}
                />
              </div>

              {/* Game Info Details Card — plain bordered box, no bg */}
              {review && (
                <div className="w-full px-7 py-5 bg-[var(--bg2)] mb-4 md:mb-8">

                <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">

                  {/* Game Info Table */}
                  <div className="flex-1 w-full min-w-0 flex flex-col justify-center py-2">
                    <div className="relative mb-5 md:flex md:items-center md:gap-2">
                      <h3 className="text-xl md:text-[22px] font-bold text-text-primary text-left">
                        {(() => {
                          const linkedGameSlug = review.game?.slug || article.games?.[0]?.slug;
                          return linkedGameSlug ? (
                            <Link href={`/games/${linkedGameSlug}`} className="hover:underline">{review.gameTitle}</Link>
                          ) : (
                            review.gameTitle
                          );
                        })()}
                      </h3>
                    </div>

                    <div className="grid grid-cols-[90px_1fr] md:grid-cols-[110px_1fr] gap-x-6 gap-y-3 text-[15px]">
                      {review.developer && (
                        <>
                          <div className="text-text-muted font-medium">Developer</div>
                          <div className="text-text-primary font-semibold">{review.developer}</div>
                        </>
                      )}
                      {review.publisher && (
                        <>
                          <div className="text-text-muted font-medium">Publisher</div>
                          <div className="text-text-primary font-semibold">{review.publisher}</div>
                        </>
                      )}
                      {review.genres && review.genres.length > 0 && (
                        <>
                          <div className="text-text-muted font-medium">Genre</div>
                          <div className="text-text-primary font-semibold">{review.genres.join(' / ')}</div>
                        </>
                      )}
                      {review.releaseDate && (
                        <>
                          <div className="text-text-muted font-medium">Released</div>
                          <div className="text-text-primary font-semibold">{formatDate(review.releaseDate)}</div>
                        </>
                      )}
                      {review.platforms && review.platforms.length > 0 && (
                        <>
                          <div className="text-text-muted font-medium pt-1.5">Platforms</div>
                          <div className="flex flex-wrap gap-2 pt-1.5">
                            {review.platforms.map(p => {
                              const lower = p.toLowerCase();
                              let customClass = 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'; // default e.g. PC
                              if (lower.includes('ps') || lower.includes('playstation')) customClass = 'bg-[#1d3596] text-white';
                              else if (lower.includes('xbox')) customClass = 'bg-[#2a6828] text-white';
                              else if (lower.includes('switch') || lower.includes('nintendo')) customClass = 'bg-[#d92222] text-white';
                              
                              return (
                                <span key={p} className={`inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded ${customClass}`}>
                                  {p}
                                </span>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    {review.showReviewDetails !== false && (
                      <div className="md:hidden flex flex-row items-center justify-center gap-5 mt-4">
                        <div 
                          className="flex items-center justify-center text-white font-black shrink-0"
                          style={{ 
                            background: getScoreColor(Number(review.reviewScore)),
                            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                            width: '80px', height: '92px', fontSize: '1.8rem'
                          }}
                        >
                          {Number(review.reviewScore).toFixed(1)}
                        </div>
                        <div className="font-gibson font-extrabold text-[20px] text-text-strong uppercase tracking-wider">{getScoreLabel(Number(review.reviewScore))}</div>
                      </div>
                    )}
                  </div>

                  {/* Right: Score Badge — desktop only; mobile shows it beside the game title above */}
                  <div className="hidden md:flex flex-col items-center justify-center shrink-0 md:mr-12 md:self-center">
                    {review.showReviewDetails !== false && (
                      <>
                        <div 
                          className="flex items-center justify-center text-white font-black"
                          style={{ 
                            background: getScoreColor(Number(review.reviewScore)),
                            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                            width: '126px', height: '145px', fontSize: '2.8rem'
                          }}
                        >
                          {Number(review.reviewScore).toFixed(1)}
                        </div>
                        <div className="font-gibson font-extrabold text-[1.4rem] text-text-strong mt-3 tracking-wide">{getScoreLabel(Number(review.reviewScore))}</div>
                      </>
                    )}
                  </div>
                </div>
                </div>
              )}

              {/* Score Update Notice */}
              {review?.scoreUpdatedAt && review.originalScore && review.showReviewDetails !== false && (
                <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 mb-6">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-400">Score Updated</p>
                    <p className="text-sm text-text-muted">
                      Original score: {Number(review.originalScore).toFixed(1)} → New score: {Number(review.reviewScore).toFixed(1)}
                      {review.scoreUpdateReason && <span> — {review.scoreUpdateReason}</span>}
                    </p>
                  </div>
                </div>
              )}

            <div id="article-content" className="w-full">
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
                <ArticleBody content={article.content} slug={slug} />
              </div>

              {review && review.showReviewDetails !== false && (
                <>
                  <VerdictBlock verdict={review.verdict} />
                  <ScoreHistorySection history={review.ScoreHistory || []} />
                  <AffiliateBox
                    productName={review.gameTitle}
                    storeName="Steam"
                    url={
                      review.game?.steamAppId
                        ? `https://store.steampowered.com/app/${review.game.steamAppId}`
                        : `https://store.steampowered.com/search/?term=${encodeURIComponent(review.gameTitle)}`
                    }
                    buttonLabel={review.game?.steamAppId ? 'Buy on Steam' : 'Check on Steam'}
                    articleSlug={slug}
                    gameSlug={review.game?.slug}
                  />
                </>
              )}

              {article.polls && article.polls.length > 0 && (
                <div className="space-y-4 mt-8 lg:hidden">
                  {article.polls.map(poll => <PollWidget key={poll.id} pollId={poll.id} />)}
                </div>
              )}

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

              <div className="flex flex-row flex-wrap items-center justify-start md:justify-between gap-4 mt-10">
                <ShareButtons title={article.title} url={`/reviews/${slug}`} />
                <div className="flex items-center gap-4 md:gap-2">
                  <ArticleLikeButton articleId={article.id} initialCount={article._count?.reactions ?? 0} />
                  <BookmarkButton articleId={article.id} />
                  <SaveToListDropdown articleId={article.id} />
                </div>
              </div>

              <div className="w-full flex justify-center">
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
