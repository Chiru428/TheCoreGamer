import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { fetchAwardYears } from '@/lib/api';
import { buildMeta } from '@/lib/seo';
import PageHeader from '@/components/ui/PageHeader';

export const revalidate = 3600;

export const metadata = buildMeta({
  title: 'Game of the Year Awards',
  description: 'TheCoreGamer Game of the Year awards — annual picks and reader votes for the best games.',
  url: '/awards',
});

export default async function AwardsIndexPage() {
  const res = await fetchAwardYears();
  const years = res.data || [];

  if (years.length === 0) {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-6 py-24 flex flex-col items-center text-center">
        <Trophy className="w-16 h-16 text-text-muted mb-4" />
        <h1 className="text-2xl font-bold text-text mb-2">Awards Coming Soon</h1>
        <p className="text-text-muted">Game of the Year awards will appear here each December.</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Game of the Year Awards"
        description="Annual editorial picks and reader votes for the best games each year"
      />
      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-6 pb-12">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {years.map((year, i) => (
            <Link
              key={year}
              href={`/awards/${year}`}
              className="relative block rounded-sm overflow-hidden border border-border bg-bg-surface transition-all duration-150 hover:-translate-y-0.5 hover:border-accent"
            >
              <div
                className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity"
                style={{ background: 'linear-gradient(135deg, var(--accent) 0%, transparent 100%)' }}
              />
              {i === 0 && (
                <span className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm z-10">
                  Live
                </span>
              )}
              <div className="relative p-6">
                <div className="text-5xl font-black" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                  {year}
                </div>
                <div className="text-text-muted text-sm font-medium mt-2">
                  View nominees &amp; winners →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
