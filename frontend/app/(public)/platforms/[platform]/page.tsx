import { fetchPlatformHub } from '@/lib/api';
import { buildMeta } from '@/lib/seo';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { CONTENT_TYPE_COLORS, getScoreBadge } from '@/lib/constants';

export const revalidate = 1800;

const PLATFORM_CONFIG: Record<string, { name: string; color: string; svg: string }> = {
 'ps5': { 
  name: 'PlayStation 5', 
  color: '#003087',
  svg: '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="48" height="48"><path d="M9.5 3v13.3l2.8.9V6.2c0-.5.2-.8.6-.7.5.1.6.5.6 1v4.4c1.6.5 3.3-.1 3.3-2.6C16.8 5.5 15.6 4 13 3.2c-.9-.3-2.3-.5-3.5-.2zM3 17.8l4.4 1.5c.8.3 1.7.4 2.4.1l9.7-3.4v-2.2l-10 3.5c-.5.2-1-.1-1-.7v-1.2c0-.4.3-.8.6-1l10.4-3.8v-2L9.8 12.2c-.4.1-.8.2-1.3.1L3 10.5v2.2l2.3.8v3.3L3 17.8z"/></svg>'
 },
 'xbox-series-x': { 
  name: 'Xbox Series X', 
  color: '#107C10',
  svg: '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="48" height="48"><path d="M4.07 5.4C2.77 6.87 2 8.84 2 11c0 3.03 1.56 5.7 3.92 7.25C6.83 14.5 9.28 11.42 12 9.1c2.72 2.32 5.17 5.4 6.08 9.15C20.44 16.7 22 14.03 22 11c0-2.16-.77-4.13-2.07-5.6-1.35 1.04-3.99 3.44-7.93 7.7-3.94-4.26-6.58-6.66-7.93-7.7zM12 2C9.52 2 7.27 2.96 5.57 4.53c1.35.88 4.03 3.23 6.43 6.1 2.4-2.87 5.08-5.22 6.43-6.1C16.73 2.96 14.48 2 12 2z"/></svg>'
 },
 'nintendo-switch': { 
  name: 'Nintendo Switch', 
  color: '#E4000F',
  svg: '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="48" height="48"><path d="M10.04 20.4H7.12C5.38 20.4 4 19.03 4 17.28V6.72C4 4.97 5.38 3.6 7.12 3.6h2.92zm1.44 0V3.6h3.4c1.74 0 3.12 1.37 3.12 3.12v10.56c0 1.75-1.38 3.12-3.12 3.12zm2.22-3.12c.62 0 1.12-.5 1.12-1.12s-.5-1.12-1.12-1.12-1.12.5-1.12 1.12.5 1.12 1.12 1.12zm-8.9-9.52c0 .62.5 1.12 1.12 1.12s1.12-.5 1.12-1.12-.5-1.12-1.12-1.12-1.12.5-1.12 1.12z"/></svg>'
 },
 'pc': { 
  name: 'PC Gaming', 
  color: '#3b82f6',
  svg: '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="48" height="48"><path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2zM4 6h16v10H4V6z"/><path d="M5.5 11.5l1.5-1.5 1 1 2-2.5 1 1L8.5 13zM13 8h5v1.5h-5zm0 2.75h5v1.5h-5zM13 13.5h3v1.5h-3z"/></svg>'
 },
 'ios': { 
  name: 'iOS', 
  color: '#555555',
  svg: '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="48" height="48"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.15-2.19 1.34-2.17 3.99.03 3.17 2.8 4.22 2.83 4.23-.03.07-.44 1.5-1.41 2.4M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>'
 },
 'android': { 
  name: 'Android', 
  color: '#3DDC84',
  svg: '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="48" height="48"><path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.633.633 0 00-.83.22l-1.88 3.24a9.822 9.822 0 00-8.94 0L5.65 5.67a.634.634 0 00-.85.22.631.631 0 00.22.85L6.86 9.48A9.986 9.986 0 002 18h20a9.986 9.986 0 00-4.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/></svg>'
 }
};

export async function generateMetadata({ params }: { params: Promise<{ platform: string }> }) {
 const { platform } = await params;
 const config = PLATFORM_CONFIG[platform];
 if (!config) return buildMeta({ title: 'Platform Not Found', description: '' });
 return buildMeta({
  title: `Best ${config.name} Games 2026 — Reviews, News, Guides`,
  description: `Discover the top rated ${config.name} games, latest news, mod guides, and reviews.`,
  url: `/platforms/${platform}`,
 });
}

export function generateStaticParams() {
 return Object.keys(PLATFORM_CONFIG).map(platform => ({ platform }));
}

export default async function PlatformHubPage({ params }: { params: Promise<{ platform: string }> }) {
 const { platform } = await params;
 const config = PLATFORM_CONFIG[platform];
 
 if (!config) {
  notFound();
 }

 const res = await fetchPlatformHub(platform);
 if (!res.success || !res.data) {
  notFound();
 }

 const { gameCount, topGames, latestArticles, upcomingGames } = res.data;

 return (
  <div className="w-full">
   {/* Hero Section */}
   <div className="relative w-full overflow-hidden py-16 px-4 mb-12 border-b border-border">
    {/* Background gradient */}
    <div 
     className="absolute inset-0 opacity-15 pointer-events-none"
     style={{ background: `linear-gradient(135deg, ${config.color} 0%, transparent 100%)` }}
    />
    <div className="absolute inset-0 bg-bg opacity-40 pointer-events-none" />
    
    <div className="relative z-10 w-full max-w-[1024px] mx-auto">
     <div className="mb-6">
      <BreadcrumbNav crumbs={[{ label: 'Platforms', href: '/platforms' }, { label: config.name }]} />
     </div>
     
     <div className="flex items-center gap-6">
      <div 
       className="text-white opacity-90 hidden sm:block"
       dangerouslySetInnerHTML={{ __html: config.svg }} 
      />
      <div>
       <h1 className="text-4xl md:text-5xl font-bold uppercase" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
        {config.name}
       </h1>
       <p className="text-text-muted mt-2 text-lg">
        {gameCount} games in our database
       </p>
      </div>
     </div>
    </div>
   </div>

   <div className="w-full max-w-[1024px] mx-auto px-4 md:px-6 pb-12">
    
    {/* Top Rated Games */}
    {topGames && topGames.length > 0 && (
     <section>
      <h2 className="section-title-bar">TOP RATED {config.name.toUpperCase()} GAMES</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
       {topGames.map((game, i) => (
        <div key={game.id} className="card-sm transition-transform hover:-translate-y-[1px] overflow-hidden">
         <Link href={`/games/${game.slug}`} className="block relative overflow-hidden aspect-[2/3] rounded-none border border-[var(--text)]">
          {game.coverImageUrl ? (
           <Image quality={100} src={game.coverImageUrl} alt={game.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" unoptimized={true} priority={i < 4} />
          ) : (
           <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e1228 0%, #0a1628 100%)' }}>
            <span className="text-3xl opacity-20">🎮</span>
           </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-[25%]" style={{ background: 'linear-gradient(to top, var(--bg3), transparent)', zIndex: 1 }} />
         </Link>
         <div style={{ padding: '12px 14px 14px' }}>
          <Link href={`/games/${game.slug}`}>
           <h3 className="line-clamp-2 hover:opacity-80 transition-opacity" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.35, marginBottom: '6px' }}>{game.title}</h3>
          </Link>
         </div>
        </div>
       ))}
      </div>
     </section>
    )}

    {/* Latest News */}
    {latestArticles && latestArticles.length > 0 && (
     <section>
      <h2 className="section-title-bar">LATEST {config.name.toUpperCase()} NEWS</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
       {latestArticles.map((article, i) => {
        const colorData = CONTENT_TYPE_COLORS[article.contentType] || { bg: 'var(--accent)' };
        return (
         <Link key={article.id} href={`/articles/${article.slug}`} className="card-sm block group">
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-none border border-[var(--text)]">
           {article.featuredImageUrl ? (
            <Image quality={100} src={article.featuredImageUrl} alt={article.title} fill className="object-cover " sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" unoptimized />
           ) : (
            <div className="w-full h-full bg-bg3" />
           )}
           <div className="absolute top-3 left-3 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: colorData.bg }}>
            {article.contentType}
           </div>
          </div>
          <div className="p-4 bg-bg-surface">
           <h3 className="font-semibold text-lg leading-snug line-clamp-2"><span className="hover-underline-animation">{article.title}</span></h3>
           <div className="flex items-center text-xs text-text-muted mt-3">
            <span>{article.author?.displayName}</span>
            <span className="mx-2">•</span>
            <span>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : ''}</span>
           </div>
          </div>
         </Link>
        );
       })}
      </div>
     </section>
    )}

    {/* Upcoming Releases */}
    {upcomingGames && upcomingGames.length > 0 && (
     <section>
      <h2 className="section-title-bar">UPCOMING FOR {config.name.toUpperCase()}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
       {upcomingGames.map((game, i) => (
        <div key={game.id} className="card-sm transition-transform hover:-translate-y-[1px] overflow-hidden">
         <Link href={`/games/${game.slug}`} className="block relative overflow-hidden aspect-[2/3] rounded-none border border-[var(--text)]">
          {game.coverImageUrl ? (
           <Image quality={100} src={game.coverImageUrl} alt={game.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" unoptimized={true} priority={i < 4} />
          ) : (
           <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e1228 0%, #0a1628 100%)' }}>
            <span className="text-3xl opacity-20">📅</span>
           </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-[25%]" style={{ background: 'linear-gradient(to top, var(--bg3), transparent)', zIndex: 1 }} />
         </Link>
         <div style={{ padding: '12px 14px 14px' }}>
          <Link href={`/games/${game.slug}`}>
           <h3 className="line-clamp-2 hover:opacity-80 transition-opacity" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.35, marginBottom: '6px' }}>{game.title}</h3>
          </Link>
          <div className="text-xs font-bold text-accent uppercase mt-2">
           {game.releaseDate ? new Date(game.releaseDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA'}
          </div>
         </div>
        </div>
       ))}
      </div>
     </section>
    )}

   </div>
  </div>
 );
}
