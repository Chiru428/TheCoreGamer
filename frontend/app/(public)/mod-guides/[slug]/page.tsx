import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { fetchModGuide } from '@/lib/api';
import { buildArticleMeta } from '@/lib/seo';
import { formatDate, wordCount } from '@/lib/utils';
import ReadingProgress from '@/components/ui/ReadingProgress';
import ArticleBody from '@/components/blog/ArticleBody';
import ReadingManager from '@/components/blog/ReadingManager';
import ArticleLikeButton from '@/components/blog/ArticleLikeButton';
import ShareButtons from '@/components/ui/ShareButtons';
import ViewTracker from '@/components/blog/ViewTracker';
import AlgoliaEventTracker from '@/components/blog/AlgoliaEventTracker';
import AlgoliaRecommendations from '@/components/blog/AlgoliaRecommendations';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import ArticleByline from '@/components/blog/ArticleByline';
import FeaturedImage from '@/components/blog/FeaturedImage';
import LazySection from '@/components/ui/LazySection';
import BookmarkButton from '@/components/blog/BookmarkButton';
import SaveToListDropdown from '@/components/public/lists/SaveToListDropdown';


import Badge from '@/components/ui/Badge';
import CompatibilityWarning from '@/components/mod/CompatibilityWarning';
import AttachmentList from '@/components/mod/AttachmentList';
import ModGuideVoteBar from '@/components/mod/ModGuideVoteBar';
import AdSlot from '@/components/monetization/AdSlot';
import JsonLd from '@/components/seo/JsonLd';
import { Zap, Wrench } from 'lucide-react';
import { SITE_URL } from '@/lib/constants';

const CommentSection = dynamic(() => import('@/components/blog/CommentSection'), {
  loading: () => <div className="mt-8 pt-8 border-t border-border space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="shimmer h-20" />)}</div>,
});

export const revalidate = 60;
interface Props { params: Promise<{ slug: string }> }

const slugifyText = (text?: string | null): string => {
  if (!text) return '';
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 50);
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const res = await fetchModGuide(slug, 60);
  if (!res.data) return {};
  return buildArticleMeta({ ...res.data, slug: slug });
}

export default async function ModGuideDetailPage({ params }: Props) {
  const { slug } = await params;
  const res = await fetchModGuide(slug, 60);
  if (!res.data) notFound();
  const article = res.data;
  const guide = article.modGuide;
  const wc = wordCount(article.modGuide?.sections || article.content);

  // Check if compatibility is stale (never verified, or verified >6 months ago)
  const isStale = guide ? (() => {
    if (!guide.lastVerifiedAt) return true;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return new Date(guide.lastVerifiedAt) < sixMonthsAgo;
  })() : false;

  // Build HowToStep list from guide section headings (available server-side).
  // Only emit steps when we have real section data — never invent steps.
  const howToSteps = guide?.sections
    ?.filter(s => s.title)
    .map(s => ({ name: s.title! })) ?? [];

  return (
    <>
      <ReadingProgress slug={slug} />
      <ViewTracker slug={slug} />
      <AlgoliaEventTracker objectID={article.id} indexName="articles" />
      {/* HowTo schema — preferred for mod/installation guides */}
      <JsonLd type={howToSteps.length > 0 ? 'HowTo' : 'Article'} data={{
        title: article.title,
        description: article.excerpt || guide?.gameName || '',
        image: article.featuredImageUrl,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
        authorName: article.author?.displayName,
        url: `${SITE_URL}/mod-guides/${slug}`,
        steps: howToSteps,
      }} />
      <JsonLd type="BreadcrumbList" data={{ items: [
        { name: 'Home', url: '/' },
        { name: 'Mod Guides', url: '/mod-guides' },
        { name: article.title, url: `/mod-guides/${slug}` },
      ]}} />
      <article className="max-w-[1280px] mx-auto px-4 lg:px-0 py-4 md:py-6 relative">
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
                    <div className="flex items-center gap-2 mb-3 px-4 py-2.5 rounded-lg border-2 border-amber-500/40 bg-amber-500/10">
                      <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                      <p className="text-sm font-semibold text-amber-300">
                        Sponsored Content{article.sponsorName ? ` — Paid partnership with ${article.sponsorName}` : ''}
                      </p>
                    </div>
                  )}
                  {article.isBreaking && (
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge variant="danger" className="text-[10px] md:text-xs"><Zap className="w-3 h-3 mr-1" />Breaking</Badge>
                    </div>
                  )}

                  <div className="mb-4">
                    <BreadcrumbNav crumbs={[
                      { label: 'Mod Guides', href: '/mod-guides', icon: <Wrench className="w-4.5 h-4.5" /> }
                    ]} />
                  </div>
                  <h1
                    className="text-[26px] md:text-[48px] font-bold text-text-primary mb-3 leading-tight text-left underline"
                    style={{ fontFamily: '"acumin-pro", system-ui, sans-serif' }}
                  >
                    {article.title}
                  </h1>

                  {article.featuredImageUrl && (
                    <FeaturedImage 
                      src={article.featuredImageUrl} 
                      alt={article.title} 
                      credit={article.featuredImageCredit} 
                      priority={true} 
                    />
                  )}
                </div>


              {/* Byline — same as news/features article pages */}
              <ArticleByline
                authorName={article.author?.displayName || 'Unknown'}
                authorUsername={article.author?.username}
                publishedAt={article.publishedAt || article.createdAt}
                commentCount={article._count?.comments ?? 0}
                title={article.title}
                url={`/mod-guides/${slug}`}
                articleId={article.id}
              />



            <div id="article-content" className="w-full">
              <ReadingManager slug={slug} wordCount={wc} />
              {/* -- Main content -- */}
              <div>
                {guide && (
                  <>
                    {isStale && (
                      <CompatibilityWarning
                        gameVersion={guide.gameVersion}
                        lastVerifiedAt={guide.lastVerifiedAt}
                        lastVerifiedVersion={guide.lastVerifiedVersion}
                        compatibilityNotes={guide.compatibilityNotes}
                      />
                    )}

                    {/* Sections — flat layout with hr dividers between each */}
                    {(guide.sections ?? []).map((section, i) => (
                      <div key={i}>
                        {i > 0 && <hr className="border-t border-border my-6 md:my-8" />}
                        {section.title && (
                          <h2 id={`h-${slugifyText(section.title)}`} className="text-xl md:text-2xl font-bold text-text-primary mb-4 mt-6 md:mt-8">
                            {section.title}
                          </h2>
                        )}
                        <div className="-mx-5 md:mx-0">
                          <ArticleBody content={section.content} slug={slug} />
                        </div>
                      </div>
                    ))}

                    {guide.attachments && <AttachmentList attachments={guide.attachments} />}
                  </>
                )}

                {article.tags && article.tags.length > 0 && (
                  <div className="mt-10">
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

                <div className="mt-6 pt-6 border-t border-border">
                  <ModGuideVoteBar slug={slug} />
                  <div className="flex flex-row flex-wrap items-center justify-start md:justify-between gap-4 mt-6">
                    <ShareButtons title={article.title} url={`/mod-guides/${slug}`} />
                    <div className="flex items-center gap-4 md:gap-2">
                      <ArticleLikeButton articleId={article.id} initialCount={article._count?.reactions ?? 0} />
                      <BookmarkButton articleId={article.id} />
                      <SaveToListDropdown articleId={article.id} />
                    </div>
                  </div>
                </div>
                <div className="w-full flex justify-center mt-8 mb-8">
                  <AdSlot slot="ADS-02" className="w-full max-w-[728px]" />
                </div>
                <CommentSection articleId={article.id} />
              </div>
            </div>
            </div>
            
              <aside className="w-full lg:flex-1 flex flex-col">
                <hr className="border-border lg:hidden w-full" />
                
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