import React from 'react';
import { fetchPlatforms } from '@/lib/api';
import { buildMeta } from '@/lib/seo';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';

export const revalidate = 1800;
export const metadata = buildMeta({ title: 'Gaming Platforms', description: 'Browse games by platform', url: '/platforms' });

const PLATFORMS: Array<{ slug: string; name: string; color: string; Icon: React.ReactNode }> = [
  {
    slug: 'ps5',
    name: 'PlayStation 5',
    color: '#003087',
    Icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
        <path d="M9.5 3v13.3l2.8.9V6.2c0-.5.2-.8.6-.7.5.1.6.5.6 1v4.4c1.6.5 3.3-.1 3.3-2.6C16.8 5.5 15.6 4 13 3.2c-.9-.3-2.3-.5-3.5-.2zM3 17.8l4.4 1.5c.8.3 1.7.4 2.4.1l9.7-3.4v-2.2l-10 3.5c-.5.2-1-.1-1-.7v-1.2c0-.4.3-.8.6-1l10.4-3.8v-2L9.8 12.2c-.4.1-.8.2-1.3.1L3 10.5v2.2l2.3.8v3.3L3 17.8z"/>
      </svg>
    ),
  },
  {
    slug: 'xbox-series-x',
    name: 'Xbox Series X',
    color: '#107C10',
    Icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
        <path d="M4.07 5.4C2.77 6.87 2 8.84 2 11c0 3.03 1.56 5.7 3.92 7.25C6.83 14.5 9.28 11.42 12 9.1c2.72 2.32 5.17 5.4 6.08 9.15C20.44 16.7 22 14.03 22 11c0-2.16-.77-4.13-2.07-5.6-1.35 1.04-3.99 3.44-7.93 7.7-3.94-4.26-6.58-6.66-7.93-7.7zM12 2C9.52 2 7.27 2.96 5.57 4.53c1.35.88 4.03 3.23 6.43 6.1 2.4-2.87 5.08-5.22 6.43-6.1C16.73 2.96 14.48 2 12 2z"/>
      </svg>
    ),
  },
  {
    slug: 'nintendo-switch',
    name: 'Nintendo Switch',
    color: '#E4000F',
    Icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
        <path d="M10.04 20.4H7.12C5.38 20.4 4 19.03 4 17.28V6.72C4 4.97 5.38 3.6 7.12 3.6h2.92zm1.44 0V3.6h3.4c1.74 0 3.12 1.37 3.12 3.12v10.56c0 1.75-1.38 3.12-3.12 3.12zm2.22-3.12c.62 0 1.12-.5 1.12-1.12s-.5-1.12-1.12-1.12-1.12.5-1.12 1.12.5 1.12 1.12 1.12zm-8.9-9.52c0 .62.5 1.12 1.12 1.12s1.12-.5 1.12-1.12-.5-1.12-1.12-1.12-1.12.5-1.12 1.12z"/>
      </svg>
    ),
  },
  {
    slug: 'pc',
    name: 'PC',
    color: '#3b82f6',
    Icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
        <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2zM4 6h16v10H4V6z"/>
      </svg>
    ),
  },
  {
    slug: 'ios',
    name: 'iOS',
    color: '#555555',
    Icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.22.15-2.19 1.34-2.17 3.99.03 3.17 2.8 4.22 2.83 4.23-.03.07-.44 1.5-1.41 2.45zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
  },
  {
    slug: 'android',
    name: 'Android',
    color: '#3DDC84',
    Icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
        <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.633.633 0 00-.83.22l-1.88 3.24a9.822 9.822 0 00-8.94 0L5.65 5.67a.634.634 0 00-.85.22.631.631 0 00.22.85L6.86 9.48A9.986 9.986 0 002 18h20a9.986 9.986 0 00-4.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/>
      </svg>
    ),
  },
];

export default async function PlatformsDirectoryPage() {
  const res = await fetchPlatforms();
  const dbPlatforms = res.data || [];

  return (
    <>
      <PageHeader title="Gaming Platforms" description="Explore the best games, news, and reviews for your favorite platform" />
      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-6 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PLATFORMS.map((platform) => {
            const dbMatch = dbPlatforms.find(p => p.platform.toLowerCase() === platform.slug || p.platform.toLowerCase().includes(platform.name.toLowerCase()));
            const gameCount = dbMatch ? dbMatch.gameCount : 0;
            
            return (
              <Link 
                key={platform.slug} 
                href={`/platforms/${platform.slug}`}
                className="block relative rounded-sm rounded-br-[24px] overflow-hidden group border border-border bg-bg-surface transition-transform hover:-translate-y-1"
              >
                <div 
                  className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity"
                  style={{ background: `linear-gradient(135deg, ${platform.color} 0%, transparent 100%)` }}
                />
                <div className="relative p-8 flex flex-col h-full min-h-[160px] justify-between">
                  <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-bold text-text" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                      {platform.name}
                    </h2>
                    <span className="opacity-80 group-hover:opacity-100 transition-opacity">
                      {platform.Icon}
                    </span>
                  </div>
                  <div className="text-text-muted mt-4">
                    {gameCount} games
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
