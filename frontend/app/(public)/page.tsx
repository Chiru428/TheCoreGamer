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
import GuidesSection from '@/components/home/GuidesSection';
import ReviewsGrid from '@/components/home/ReviewsGrid';
import EditorialTabsSection from '@/components/home/EditorialTabsSection';
import DealsSection from '@/components/home/DealsSection';
import PollWidget from '@/components/blog/PollWidget';
import { contentTypePath } from '@/lib/seo';
import AdSlot from '@/components/monetization/AdSlot';

// Hide all ad layer boxes when AdSense is not yet configured
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

  return {
   heroArticles,
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
  <div className={`flex items-center justify-between ${className ?? 'mb-4'}`}>
   <div className="section-title-bar">
    {title}
   </div>
  </div>
 );
}

function SeeMoreBtn({ href, label }: { href: string; label: string }) {
 return (
  <div className="mt-7">
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
  <div className="rubik-label flex items-center gap-2 mb-4" style={{ fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-strong)' }}>
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
     <div className="relative overflow-hidden aspect-[2/3] w-full rounded border border-[var(--text)]">
      {g.coverImageUrl ? (
       <Image src={g.coverImageUrl} alt={g.title} fill className="object-cover transition-transform duration-1000 ease-out " sizes="(max-width: 768px) 50vw, 225px" />
      ) : (
       <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e1228 0%, #0a1628 100%)' }}>
        <span className="text-3xl opacity-20">🎮</span>
       </div>
      )}
     </div>
     <div className="pt-3">
      <p className="post-card-title font-bold group-hover:underline transition-colors text-[16px] md:text-[20px]" style={{ color: 'var(--text-strong)', lineHeight: 1.3, marginBottom: '4px' }}>{g.title}</p>
      {g.publisher && (
       <p className="hidden md:block" style={{ fontSize: '16px', color: 'var(--muted)', fontWeight: 400 }}>{g.publisher}</p>
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
 const { heroArticles, newsArticles, reviewArticles, guideArticles, dealArticles, hotDeals, listicleArticles, opinionArticles, popularArticles, homepagePollId, homepagePoll2Id, topRatedGames, newReleaseGames, comingSoonGames } = await getData();

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
    .home-page-root .post-card-title * {
     font-family: "Rubik", sans-serif !important;
    }
    .home-page-root .hero-main-title.post-card-title {
     font-family: "acumin-pro", sans-serif !important;
    }
    /* Popular This Week list titles use Rubik (falls through to the
      .post-card-title Rubik rule above). */
    .home-page-root .rubik-title.post-card-title,
    .home-page-root .rubik-title.post-card-title * {
     font-family: "Rubik", sans-serif !important;
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
    .home-page-root h2.hero-post-title {
     font-size: 22px !important;
    }
    @media (min-width: 768px) {
     .home-page-root h2.hero-post-title {
      font-size: 36px !important;
     }
    }
    .home-page-root h3, .home-page-root h4, .home-page-root h5, .home-page-root h6 {
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
     font-family: "Rubik", sans-serif !important;
     font-size: 24px !important;
     line-height: 1.2 !important;
     color: #3b82f6 !important;
    }
    @media (min-width: 768px) {
     .home-page-root .section-title-bar {
      font-size: 28px !important;
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
     font-size: clamp(24px, 4vw, 40px) !important;
     line-height: 1.1 !important;
    }
   `}} />

   {/* -- TOP AD SLOT (KOTAKU STYLE) -- */}
   {adsEnabled && (
   <div className="hidden sm:flex w-full justify-center border-b border-white/[0.06]" style={{ background: 'var(--bg2)' }}>
     <div className="w-full max-w-[970px] min-h-[250px] flex items-center justify-center py-5">
       <AdSlot slot="ADS-01" className="w-full" />
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
       <AdSlot slot="ADS-01" className="w-full" />
     </div>
   </div>
   )}

   {/* -- PAGE BODY -------------------------------------------- */}
   <div className="w-full max-w-[1280px] mx-auto px-4 lg:px-0 pt-10 md:pt-14 pb-7">

    {/* TRENDING / NEWS */}
    {newsArticles.length > 0 && (
     <section className="mb-14 md:mb-20 last:mb-0">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-4">
       <div className="md:col-span-3 flex items-center">
        <SectionHead title="News & Updates" className="mb-0" />
       </div>

      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 lg:gap-[10px]">
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <HomePostCard article={newsArticles[0]} titleClassName="!text-[18px]" showExcerptOnMobile={true} showBackground={false} truncateTitle={false} showViewArticle={false} />
        {newsArticles.slice(1, 3).map((a) => (
         <HomePostCard key={a.id} article={a} mobileHorizontal={true} titleClassName="!text-[15px] sm:!text-[18px]" showBackground={false} truncateTitle={false} showViewArticle={false} />
        ))}
       </div>

       {/* LATEST NEWS — same connector-line timeline as "Popular This Week" / Reviews' Latest list.
         Wrapped in absolute inset-0 so this column's content never inflates the grid row height —
         the row height is driven purely by the 3 news cards, and this list stretches+clips to match. */}
       {newsArticles.slice(3, 11).length > 0 && (
        <div className="mt-4 lg:mt-0 lg:relative lg:overflow-hidden">
         <div className="flex flex-col overflow-hidden lg:absolute lg:inset-0">

          <div className="flex flex-col pr-1 lg:overflow-y-auto lg:no-scrollbar lg:flex-1 lg:min-h-0">
           {newsArticles.slice(3, 11).map((article, idx, arr) => {
            const tc = CONTENT_TYPE_COLORS[article.contentType] || { bg: 'var(--accent)', color: '#fff' };
            const isLast = idx === arr.length - 1;
            return (
             <Link
              key={article.id}
              href={`/${contentTypePath(article.contentType)}/${article.slug}`}
              className={`group relative flex items-stretch gap-2${!isLast ? ' mb-7' : ''}`}
             >
              <div className="flex-1 min-w-0 flex flex-col">
               {/* Top row: date and badge share the same row */}
               <div className="flex items-center gap-2 shrink-0">
                <span className="shrink-0" style={{ width: '36px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--muted2)', lineHeight: 1, whiteSpace: 'nowrap' }}>
                 {formatShortDate(article.publishedAt)}
                </span>
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.25em', textTransform: 'uppercase', color: tc.textColor || tc.bg, lineHeight: 1 }}>
                 {CONTENT_TYPE_LABELS[article.contentType] || article.contentType}
                </span>
               </div>
               {/* Bottom row: connector line under the date column, title under the badge column */}
               <div className="flex gap-2 mt-1.5 flex-1">
                <div className="shrink-0 relative" style={{ width: '36px' }}>
                 {!isLast && (
                  <div className="absolute top-0 -bottom-6 w-[2px] bg-[var(--muted3)] -translate-x-1/2" style={{ left: '50%' }} />
                 )}
                </div>
                <h3 className="flex-1 min-w-0 post-card-title popular-title-acumin transition-colors group-hover:underline group-hover:underline text-[16px]" style={{ fontWeight: 700, lineHeight: 1.35, color: 'var(--text-strong)', fontFamily: "'Rubik', sans-serif" }}>
                 {article.title}
                </h3>
               </div>
              </div>
              {/* Small cover image, vertically centered */}
              <div className="relative w-[130px] h-[73px] sm:w-[114px] sm:h-[64px] shrink-0 overflow-hidden bg-[var(--deep,#0d0d1a)] self-center">
               {article.featuredImageUrl ? (
                <Image src={article.featuredImageUrl} alt={article.title} fill className="object-cover" sizes="130px" />
               ) : (
                <div className="w-full h-full flex items-center justify-center"><Gamepad2 className="w-4 h-4 opacity-30" /></div>
               )}
              </div>
             </Link>
            );
           })}
          </div>
         </div>
        </div>
       )}
      </div>
      <SeeMoreBtn href="/news" label="News" />
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

      <ReviewsGrid articles={reviewArticles.slice(0, 7)} />
      <SeeMoreBtn href="/reviews" label="Reviews" />
     </section>
    )}

    {/* AD SLOT BELOW REVIEWS */}
    {adsEnabled && (
    <div className="mb-10 md:mb-14 flex justify-center w-full">
      <div className="hidden sm:flex w-full bg-[var(--bg2)] py-5 items-center justify-center border border-[var(--border)]">
        <div className="w-full max-w-[970px] min-h-[250px] flex items-center justify-center px-4">
          <AdSlot slot="ADS-02" className="w-full" />
        </div>
      </div>
      <div className="flex sm:hidden w-[100vw] relative left-[50%] -translate-x-1/2 bg-[var(--bg2)] py-5 items-center justify-center border-y border-[var(--border)]">
        <div className="w-full min-h-[250px] flex items-center justify-center px-4">
          <AdSlot slot="ADS-02" className="w-full" />
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
     <section className="relative w-[100vw] left-[50%] -translate-x-1/2 mb-10 md:mb-14 py-5 overflow-hidden border-y border-white/10 shadow-2xl">
      {/* Blurred image matching Hero styling, but with less blur for more visibility */}
      <div
        aria-hidden="true"
        className="hero-backdrop-img absolute inset-0 w-full h-full pointer-events-none"
        style={{
          backgroundImage: `url('/images/gamesbd.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          filter: 'blur(12px) saturate(1.25)',
          transform: 'scale(1.12)',
        }}
      />
      {/* Light/Dark theme gradient overlay and accent line */}
      <style>{`
        .games-backdrop-overlay {
          background: linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.65) 30%, rgba(255,255,255,0.65) 65%, rgba(255,255,255,0.95) 100%);
        }
        .games-accent-line {
          /* Colorful gradient for both themes */
          background: linear-gradient(90deg, transparent 0%, rgba(0,229,160,0.6) 30%, rgba(195,160,60,0.6) 70%, transparent 100%);
        }
        
        [data-theme="dark"] .games-backdrop-overlay {
          background: linear-gradient(180deg, rgba(5,4,2,0.75) 0%, rgba(8,6,2,0.55) 30%, rgba(8,6,2,0.55) 65%, rgba(5,4,2,0.85) 100%);
        }
      `}</style>
      <div
        aria-hidden="true"
        className="games-backdrop-overlay absolute inset-0 w-full h-full pointer-events-none transition-colors duration-500"
      />
      {/* Bottom accent line */}
      <div
        aria-hidden="true"
        className="games-accent-line absolute bottom-0 left-0 w-full h-[2px] pointer-events-none transition-all duration-500"
      />
      
      {/* Content wrapper */}
      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-4 lg:px-0">
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
    {dealArticles.length > 0 && (
     <section className="mb-10 md:mb-14 last:mb-0">
      <SectionHead title="Deals" />

      <DealsSection articles={dealArticles.slice(0, 4)} sideArticles={hotDeals} />

      <SeeMoreBtn href="/deals" label="Deals" />
     </section>
    )}

    {/* AD SLOT BETWEEN DEALS & WALKTHROUGHS */}
    {adsEnabled && (
    <div className="mb-10 md:mb-14 flex justify-center w-full">
      <div className="hidden sm:flex w-full bg-[var(--bg2)] py-5 items-center justify-center border border-[var(--border)]">
        <div className="w-full max-w-[970px] min-h-[250px] flex items-center justify-center px-4">
          <AdSlot slot="ADS-02" className="w-full" />
        </div>
      </div>
      <div className="flex sm:hidden w-[100vw] relative left-[50%] -translate-x-1/2 bg-[var(--bg2)] py-5 items-center justify-center border-y border-[var(--border)]">
        <div className="w-full min-h-[250px] flex items-center justify-center px-4">
          <AdSlot slot="ADS-02" className="w-full" />
        </div>
      </div>
    </div>
    )}

    {/* GUIDES */}
    {guideArticles.length > 0 && (
     <section className="mb-10 md:mb-14 last:mb-0">
      <SectionHead title="Guides" />
      <GuidesSection guides={guideArticles} />
     </section>
    )}


    {/* EDITORIAL */}
    {(listicleArticles.length > 0 || opinionArticles.length > 0) && (
     <section className="mb-10 md:mb-14 last:mb-0">
      {/* Mobile Poll (Above Section Head) */}
      <div className="lg:hidden mb-14 flex flex-col gap-8">
       {homepagePoll2Id && (
         <PollWidget pollId={homepagePoll2Id} />
       )}
      </div>

      <SectionHead title="Editorial" />
      
      <div className="flex flex-col lg:flex-row gap-10 lg:items-stretch">
       <div className="flex flex-col gap-6 w-full max-w-[800px]">
        <EditorialTabsSection 
          corePicks={listicleArticles} 
          opinions={opinionArticles} 
        />
       </div>

       {/* Desktop Sidebar (Poll) */}
       <div className="hidden lg:block flex-1 w-full">
        {homepagePoll2Id && (
         <div className="w-full sticky top-24 pb-10">
           <PollWidget pollId={homepagePoll2Id} />
         </div>
        )}
       </div>
      </div>
     </section>
    )}

   </div>


  </div>
 );
}
