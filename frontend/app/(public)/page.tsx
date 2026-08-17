import Link from 'next/link';
import Image from 'next/image';
import { fetchHomepage, fetchGames } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import HomePostCard from '@/components/blog/HomePostCard';
import { Gamepad2 } from 'lucide-react';
import { CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS, SITE_NAME, SITE_DESCRIPTION } from '@/lib/constants';
import type { Article } from '@/types';
import type { Metadata } from 'next';
import HeroSection from '@/components/blog/HeroSection';

import ScrollableArticleSection from '@/components/home/ScrollableArticleSection';
import GameTabsSection from '@/components/home/GameTabsSection';
import ReviewsGrid from '@/components/home/ReviewsGrid';
import NewsWithTrending from '@/components/home/NewsWithTrending';
import DiscoveryTabsSection from '@/components/home/DiscoveryTabsSection';
import PollWidget from '@/components/blog/PollWidget';
import { contentTypePath } from '@/lib/seo';
import AdSlot from '@/components/monetization/AdSlot';

// Ad slots always enabled on homepage
const adsEnabled = !!process.env.NEXT_PUBLIC_ADSENSE_ID;

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
 title: `${SITE_NAME} — Reviews, News & Guides`,
 description: SITE_DESCRIPTION,
};

async function getData() {
 const [data, topRatedGamesRes, newReleaseGamesRes, comingSoonGamesRes] = await Promise.all([
  fetchHomepage(),
  fetchGames({ fields: 'card', sort: 'top-rated', limit: 6 }),
  fetchGames({ fields: 'card', sort: 'newest', limit: 6, maxReleaseDate: new Date().toISOString() }),
  fetchGames({ fields: 'card', sort: 'coming-soon', limit: 6 }),
 ]);

 const rawLatest = data.data?.latest ?? [];
 const featuredRaw = data.data?.featured ?? [];

 // Only use explicitly featured articles, and exclude any 'deal' articles
 const heroArticles: Article[] = featuredRaw
  .filter((a: Article) => a.contentType !== 'DEAL')
  .slice(0, 4);

 // Remove hero articles from every content feed to avoid duplication
 const heroIds = new Set(heroArticles.map((a: Article) => a.id));
 const dedup = (arr: Article[]) => arr.filter((a: Article) => !heroIds.has(a.id));

  const dealArticles = dedup(data.data?.deals ?? []);
  const popularArticles = data.data?.popular ?? [];
  const popularDeals = popularArticles.filter((a: Article) => a.contentType === 'DEAL');
  const breakingDeals = dealArticles.filter((a: Article) => a.isBreaking);

  // Build the 4 'Hot Deals' for the sidebar: breaking first, then popular, then latest
  const hotDeals = [...breakingDeals];
  for (const pd of popularDeals) {
    if (hotDeals.length >= 4) break;
    if (!hotDeals.find(d => d.id === pd.id)) hotDeals.push(pd);
  }
  for (const d of dealArticles) {
    if (hotDeals.length >= 4) break;
    if (!hotDeals.find(h => h.id === d.id)) hotDeals.push(d);
  }
  
  // Remove hotDeals from main deal articles so they aren't duplicated in the main view
  const hotDealIds = new Set(hotDeals.map(d => d.id));
  const mainDealArticles = dealArticles.filter(d => !hotDealIds.has(d.id));

  const filteredLatest = rawLatest.filter((a: Article) => a.contentType !== 'NEWS' && a.contentType !== 'REVIEW');

  return {
   heroArticles,
   latestArticles: dedup(filteredLatest),
   newsArticles: dedup(data.data?.news ?? []),
   reviewArticles: dedup(data.data?.reviews ?? []),
   guideArticles: dedup(data.data?.guides ?? []),
   dealArticles: mainDealArticles,
   hotDeals,
   listicleArticles: dedup(data.data?.listicles ?? []),
  opinionArticles: dedup(data.data?.opinions ?? []),
  popularArticles: data.data?.popular ?? [],
  homepagePollId: data.data?.homepagePollId ?? null,
  homepagePoll2Id: data.data?.homepagePoll2Id ?? null,
  topRatedGames: topRatedGamesRes.data ?? [],
  newReleaseGames: newReleaseGamesRes.data ?? [],
  comingSoonGames: comingSoonGamesRes.data ?? [],
 };
}

/* -- Section header ------------------------------------------------ */
function SectionHead({ title, className }: { title: string; className?: string }) {
 return (
  <div className={`flex flex-col items-start ${className ?? 'mb-4'}`}>
   <div className="w-[60px] h-[6px] bg-gradient-to-r from-[#ff4b4b] to-[#ff9033] mb-2" />
   <div className="section-title-bar font-bold text-[var(--text)] uppercase">
    {title}
   </div>
  </div>
 );
}

function SeeMoreBtn({ href, label, className }: { href: string; label: string; className?: string }) {
 return (
  <div className={`mt-7 ${className ?? ''}`}>
   <Link
    href={href}
    className="flex justify-center w-full sm:w-auto sm:inline-flex items-center rounded-full px-8 font-bold tracking-wide text-black border border-[#00e5a0] bg-[#00e5a0] hover:bg-[#00c98a] hover:border-[#00c98a] hover:underline transition-colors duration-200"
    style={{ height: '33px', fontSize: '16px' }}
   >
    See more {label}
   </Link>
  </div>
 );
}

/* -- Sub-section header (e.g. "New Releases" / "Top Rated" under "Games") -- */
function SubHead({ title }: { title: string }) {
 return (
  <div className="gibson-label flex items-center gap-2 mb-4" style={{ fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-strong)' }}>
   <span style={{ width: '3px', height: '1em', background: 'var(--accent)', borderRadius: '2px', display: 'inline-block' }} />
   {title}
  </div>
 );
}

/* -- Row of game cover cards used under the Games section ------------- */
function GameRow({ games }: { games: { id: string; slug: string; title: string; publisher?: string | null; coverImageUrl?: string | null }[] }) {
 return (
  <div className="grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-6">
   {games.map((g) => (
    <Link key={g.id} href={`/games/${g.slug}`} className="group block overflow-hidden">
     <div className="relative overflow-hidden aspect-[2/3] w-full rounded-none border border-[var(--text)]">
      {g.coverImageUrl ? (
       <Image quality={100} src={g.coverImageUrl} alt={g.title} fill className="object-cover transition-transform duration-1000 ease-out " sizes="(max-width: 768px) 50vw, 225px" />
      ) : (
       <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e1228 0%, #0a1628 100%)' }}>
        <span className="text-3xl opacity-20">🎮</span>
       </div>
      )}
     </div>
     <div className="pt-3">
      <p className="post-card-title font-bold transition-colors text-[16px] md:text-[18px]" style={{ color: 'var(--text-strong)', lineHeight: 1.3, marginBottom: '4px' }}><span className="hover-underline-animation">{g.title}</span></p>
      {g.publisher && (
       <p className="hidden md:block" style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 400 }}>{g.publisher}</p>
      )}
     </div>
    </Link>
   ))}
  </div>
 );
}

function formatShortDate(dateString?: string | null) {
 if (!dateString) return '';
 return new Date(dateString)
  .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  .toUpperCase();
}

export default async function HomePage() {
 const { heroArticles, latestArticles, newsArticles, reviewArticles, guideArticles, dealArticles, hotDeals, listicleArticles, opinionArticles, popularArticles, homepagePollId, homepagePoll2Id, topRatedGames, newReleaseGames, comingSoonGames } = await getData();

 return (
  <div className="home-page-root" style={{ background: 'var(--bg)', fontFamily: '"acumin-pro", sans-serif', fontSize: '15px' }}>
   <style dangerouslySetInnerHTML={{ __html: `
    .home-page-root * {
     font-family: "acumin-pro", sans-serif !important;
    }
    .home-page-root .widget-title,
    .home-page-root .so-title,
    .home-page-root .btn-primary,
    .home-page-root .signup-btn,
    .home-page-root .auth-submit-btn,
    .home-page-root .post-card-title,
    .home-page-root .post-card-title *,
    .home-page-root .gibson-label {
     font-family: "Gibson", sans-serif !important;
    }

    /* Popular This Week list titles use Gibson (falls through to the
      .post-card-title Gibson rule above). */
    .home-page-root .gibson-title.post-card-title,
    .home-page-root .gibson-title.post-card-title * {
     font-family: "Gibson", sans-serif !important;
    }
    .home-page-root h2 {
     font-size: 16px !important;
     line-height: 1.4 !important;
    }
    @media (min-width: 768px) {
     .home-page-root h2 {
      font-size: 20px !important;
     }
    }
    .home-page-root .news-hero-title {
     font-size: 18px !important;
     line-height: 1.2 !important;
    }
    @media (min-width: 768px) {
     .home-page-root .news-hero-title {
      font-size: 26px !important;
     }
    }
    .home-page-root h2.hero-post-title {
     font-size: 22px !important;
    }
    @media (min-width: 768px) {
     .home-page-root h2.hero-post-title {
      font-size: 36px !important;
     }
    }
    .home-page-root h4, .home-page-root h5, .home-page-root h6 {
     font-size: 18px !important;
     line-height: 1.4 !important;
    }
    @media (max-width: 639px) {
     .home-page-root .deal-small-title {
      font-size: 15px !important;
     }
    }
    .home-page-root .deal-card-title {
     font-size: 16px !important;
    }
    @media (min-width: 768px) {
     .home-page-root .deal-card-title {
      font-size: 24px !important;
     }
    }
    .home-page-root .popular-title-acumin {
     font-size: 16px !important;
     line-height: 1.35 !important;
    }
    .home-page-root .section-title-bar {
     font-family: "Gibson", sans-serif !important;
     font-size: 28px !important;
     line-height: 1.2 !important;
     font-weight: 700 !important;
    }
    @media (min-width: 768px) {
     .home-page-root .section-title-bar {
      font-size: 32px !important;
     }
    }
    .home-page-root .section-title-bar::before {
     display: none !important;
    }
    .home-page-root .strategy-list-title {
     font-size: 14px !important;
    }
    @media (max-width: 640px) {
     .home-page-root .fy-card-title {
      font-size: 14px !important;
      line-height: 1.15 !important;
     }
    }
    .home-page-root h1 {
     /* Allow hero titles to be larger */
     font-size: clamp(20px, 4vw, 40px) !important;
     line-height: 1.1 !important;
    }
   `}} />

   {/* -- TOP AD SLOT (KOTAKU STYLE) -- */}
   {adsEnabled && (
   <div className="hidden sm:flex w-full justify-center border-b border-white/[0.06]" style={{ background: 'var(--bg2)' }}>
     <div className="w-full max-w-[970px] min-h-[250px] flex items-center justify-center py-5">
       <AdSlot slot="ADS-01" className="w-full" showPlaceholder />
     </div>
   </div>
   )}



   {/* ── HERO ZONE — Elden Ring blurred backdrop ───────────────────────── */}
   {heroArticles.length > 0 ? (
    <HeroSection articles={heroArticles} popularArticles={popularArticles} />
   ) : (
    <section className="flex flex-col items-center justify-center text-center" style={{ height: '320px', background: `linear-gradient(135deg, var(--hero-bg1) 0%, var(--hero-bg2) 50%, var(--bg) 100%)` }}>
     <h1 style={{ fontSize: '40px', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '8px' }}>Welcome to {SITE_NAME}</h1>
     <p style={{ fontSize: '14px', color: 'var(--muted)' }}>No articles yet. Check back soon!</p>
    </section>
   )}





   {/* MOBILE ONLY: ADS-01 placed below Hero section (which includes Popular This Week) */}
   {adsEnabled && (
   <div className="flex sm:hidden w-full bg-[var(--bg2)] py-5 justify-center border-y border-[var(--border)]">
     <div className="w-full min-h-[250px] flex items-center justify-center px-4">
       <AdSlot slot="ADS-01" className="w-full" showPlaceholder />
     </div>
   </div>
   )}

   {/* -- PAGE BODY -------------------------------------------- */}
   <div className="w-full max-w-[1280px] mx-auto px-4 lg:px-0 pt-10 md:pt-14 pb-0">

    {/* TRENDING / NEWS */}
    {newsArticles.length > 0 && (
     <section className="mb-14 md:mb-20 last:mb-0">
      <SectionHead title="Latest News" />
      <NewsWithTrending
       newsArticles={newsArticles.slice(0, 5)}
       trendingArticles={[...newsArticles].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))}
       actionButton={<SeeMoreBtn href="/news" label="News" className="!mt-0" />}
      />
     </section>
    )}

    {/* REVIEWS */}
    {reviewArticles.length > 0 && (
     <section className="mb-10 md:mb-14 last:mb-0">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-4">
       <div className="md:col-span-3 flex items-center">
        <SectionHead title="Reviews" className="mb-0" />
       </div>

      </div>

      <ReviewsGrid articles={reviewArticles.slice(0, 6)} />
      <SeeMoreBtn href="/reviews" label="Reviews" />
     </section>
    )}

    {/* AD SLOT BELOW REVIEWS */}
    {adsEnabled && (
    <div className="mb-10 md:mb-14 flex justify-center w-full">
      <div className="hidden sm:flex w-full bg-[var(--bg2)] py-5 items-center justify-center border border-[var(--border)]">
        <div className="w-full max-w-[970px] min-h-[250px] flex items-center justify-center px-4">
          <AdSlot slot="ADS-02" className="w-full" showPlaceholder />
        </div>
      </div>
      <div className="flex sm:hidden w-[100vw] relative left-[50%] -translate-x-1/2 bg-[var(--bg2)] py-5 items-center justify-center border-y border-[var(--border)]">
        <div className="w-full min-h-[250px] flex items-center justify-center px-4">
          <AdSlot slot="ADS-02" className="w-full" showPlaceholder />
        </div>
      </div>
    </div>
    )}

    {/* HOMEPAGE POLL */}
    {homepagePollId && (
     <section className="mb-14 md:mb-20 last:mb-0">
      <div className="w-full max-w-[1280px] mx-auto">
       <div className="flex justify-center w-full">
         <div className="w-full max-w-[800px]">
          <PollWidget pollId={homepagePollId} />
         </div>
       </div>
      </div>
     </section>
    )}

    {/* GAMES */}
    {(newReleaseGames.length > 0 || topRatedGames.length > 0 || comingSoonGames.length > 0) && (
     <section className="mb-10 md:mb-14 last:mb-0">

      {/* Content wrapper */}
      <div className="relative z-10">
        <SectionHead title="Games" className="mb-6" />
        
        <div className="mb-6">
          <GameTabsSection
           newReleaseGames={newReleaseGames}
           topRatedGames={topRatedGames}
           comingSoonGames={comingSoonGames}
          />
        </div>
        
        <SeeMoreBtn href="/games" label="Games" />
      </div>
     </section>
    )}


    {/* DEALS */}
    {(() => {
      const allDeals = [...dealArticles, ...hotDeals].filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i);
      if (allDeals.length === 0) return null;
      return (
       <section className="mb-10 md:mb-14 last:mb-0">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-4">
         <div className="md:col-span-3 flex items-center">
          <SectionHead title="Deals" className="mb-0" />
         </div>
        </div>
        <ReviewsGrid articles={allDeals.slice(0, 6)} />
        <SeeMoreBtn href="/deals" label="Deals" />
       </section>
      );
    })()}

    {/* GUIDES */}
    {(() => {
      if (guideArticles.length === 0) return null;
      let popularGuides = popularArticles.filter(a => a.contentType === 'GUIDE');
      
      // If we have less than 6 popular guides, pad them with the most viewed latest guides
      if (popularGuides.length < 6) {
        const existingIds = new Set(popularGuides.map(g => g.id));
        const extraGuides = [...guideArticles]
          .filter(g => !existingIds.has(g.id))
          .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
        
        popularGuides = [...popularGuides, ...extraGuides];
      }

      return (
       <section className="mb-14 md:mb-20 last:mb-0">
        <SectionHead title="Guides" />
        <NewsWithTrending
         newsArticles={guideArticles.slice(0, 5)}
         trendingArticles={popularGuides}
         sidebarTitle="Popular Guides"
         showBadge={true}
         actionButton={<SeeMoreBtn href="/guides" label="Guides" className="!mt-0" />}
        />
       </section>
      );
    })()}

    {/* DISCOVERY — tabbed feed (845px) + Poll sidebar */}
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 mb-0">

     {/* Left: IGN-style tabbed section — capped at 845px */}
     <div className="w-full" style={{ maxWidth: '845px' }}>
      <DiscoveryTabsSection
       latestArticles={latestArticles}
       guideArticles={guideArticles}
       listicleArticles={listicleArticles}
       opinionArticles={opinionArticles}
       dealArticles={dealArticles}
       hotDeals={hotDeals}
      />
     </div>

     {/* Right: Poll widget & Sticky Ad */}
     {homepagePoll2Id && (
      <div className="flex-1 w-full min-w-0 mt-2 lg:mt-[145px]">
        <div className="mb-0 lg:mb-10">
         <PollWidget pollId={homepagePoll2Id} />
        </div>
        
        {adsEnabled && (
         <div className="flex justify-center lg:sticky lg:top-[100px] mt-8 w-full">
          <div className="w-full bg-[var(--bg2)] py-5 px-4 flex items-center justify-center border border-[var(--border)]">
            <AdSlot slot="ADS-06" className="w-full flex justify-center" showPlaceholder />
          </div>
         </div>
        )}
      </div>
     )}

    </div>

   </div>


  </div>
 );
}
