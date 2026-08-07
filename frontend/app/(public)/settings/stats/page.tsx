'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fetchAuthorPerformance } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatNumber, formatDate } from '@/lib/utils';
import { Eye, FileText, MessageSquare, Star, TrendingUp, ExternalLink } from 'lucide-react';
import { Role } from '@/types';
import Skeleton from '@/components/ui/Skeleton';
import { contentTypePath } from '@/lib/seo';

export default function MyPerformancePage() {
  const { user, isAuthenticated, isLoading, hasRole } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login?callbackUrl=/settings/stats');
    } else if (!isLoading && !hasRole([Role.AUTHOR, Role.EDITOR, Role.ADMIN])) {
      router.replace('/settings/profile');
    }
  }, [isLoading, isAuthenticated, hasRole, router]);

  const { data, isLoading: isSWRLoading } = useSWR(
    user ? ['author-performance', user.id] : null,
    () => fetchAuthorPerformance(user!.id).then(r => r.data)
  );

  if (!isAuthenticated || !hasRole([Role.AUTHOR, Role.EDITOR, Role.ADMIN])) return null;

  // Shared row class
  const rowCls = 'flex items-center justify-between px-5 py-4 border-b border-border dark:border-white/[0.07] last:border-0 transition-colors';

  if (isSWRLoading || !data) {
    return (
      <div className="space-y-10 w-full animate-pulse" style={{ fontFamily: "'Gibson', sans-serif" }}>
        
        <div>
          <div className="mb-4">
            <div className="h-6 w-48 rounded bg-gray-200 dark:bg-white/[0.06]" />
            <div className="mt-1 h-4 w-64 rounded bg-gray-200 dark:bg-white/[0.06]" />
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border dark:border-white/[0.08] p-4 space-y-2">
                <div className="h-4 w-24 rounded bg-gray-200 dark:bg-white/[0.06]" />
                <div className="h-8 w-16 rounded bg-gray-200 dark:bg-white/[0.06]" />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-white/[0.06] mb-4" />
          <div className="h-5 w-1/2 rounded bg-gray-200 dark:bg-white/[0.06]" />
        </div>

        <div>
          <div className="h-6 w-32 rounded bg-gray-200 dark:bg-white/[0.06] mb-4" />
          <div className="rounded-xl border border-border dark:border-white/[0.08] overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={rowCls}>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-white/[0.06]" />
                  <div className="h-3 w-24 rounded bg-gray-200 dark:bg-white/[0.06]" />
                </div>
                <div className="h-5 w-20 rounded bg-gray-200 dark:bg-white/[0.06] shrink-0" />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="h-6 w-36 rounded bg-gray-200 dark:bg-white/[0.06] mb-4" />
          <div className="w-full h-[200px] rounded-xl bg-gray-200 dark:bg-white/[0.06]" />
        </div>
      </div>
    );
  }

  const monthFormatter = (m: any) => {
    const [, month] = String(m).split('-');
    return new Date(2000, Number(month) - 1, 1).toLocaleDateString('en-US', { month: 'short' });
  };

  return (
    <div className="space-y-10 w-full" style={{ fontFamily: "'Gibson', sans-serif" }}>

      <div>
        <div className="mb-4">
          <h3 className="text-[18px] font-bold text-text-primary">Performance</h3>
          <p className="text-[13px] text-text-muted mt-0.5">Overview of your published content engagement.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border dark:border-white/[0.08] dark:bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-2 text-[13px] font-medium text-text-muted"><Eye className="w-4 h-4" />Total Views</div>
            <p className="text-[24px] font-bold text-text-primary">{formatNumber(data.totalViews)}</p>
          </div>
          <div className="rounded-xl border border-border dark:border-white/[0.08] dark:bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-2 text-[13px] font-medium text-text-muted"><TrendingUp className="w-4 h-4" />This Month</div>
            <p className="text-[24px] font-bold text-text-primary">{formatNumber(data.viewsThisMonth)}</p>
          </div>
          <div className="rounded-xl border border-border dark:border-white/[0.08] dark:bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-2 text-[13px] font-medium text-text-muted"><FileText className="w-4 h-4" />Articles</div>
            <p className="text-[24px] font-bold text-text-primary">{formatNumber(data.articleCount)}</p>
          </div>
          <div className="rounded-xl border border-border dark:border-white/[0.08] dark:bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-2 text-[13px] font-medium text-text-muted"><Eye className="w-4 h-4" />Avg Views/Article</div>
            <p className="text-[24px] font-bold text-text-primary">{formatNumber(Math.round(data.avgViewsPerArticle))}</p>
          </div>
          <div className="rounded-xl border border-border dark:border-white/[0.08] dark:bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-2 text-[13px] font-medium text-text-muted"><MessageSquare className="w-4 h-4" />Comments</div>
            <p className="text-[24px] font-bold text-text-primary">{formatNumber(data.totalComments)}</p>
          </div>
          <div className="rounded-xl border border-border dark:border-white/[0.08] dark:bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-2 text-[13px] font-medium text-text-muted"><Star className="w-4 h-4" />Reviews</div>
            <p className="text-[24px] font-bold text-text-primary">{formatNumber(data.reviewCount)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5">
        <p className="text-[14px] text-text-primary leading-relaxed">
          You rank in the <span className="font-bold text-blue-500 dark:text-blue-400">top {100 - data.percentileRank}%</span> of authors by total views.<br />
          <span className="text-text-muted text-[13px] mt-1 inline-block">(Site average: {formatNumber(Math.round(data.siteAverageViews))} views/article).</span>
        </p>
      </div>

      <div>
        <div className="mb-4">
          <h3 className="text-[18px] font-bold text-text-primary">Top Articles</h3>
          <p className="text-[13px] text-text-muted mt-0.5">Your most viewed content across the platform.</p>
        </div>
        {data.topArticles.length > 0 ? (
          <div className="rounded-xl border border-border dark:border-white/[0.08] overflow-hidden">
            {data.topArticles.map((a) => (
              <div key={a.id} className={rowCls + ' hover:bg-black/5 dark:hover:bg-white/[0.02]'}>
                <div className="flex-1 min-w-0 pr-4">
                  <Link href={`/${contentTypePath(a.contentType)}/${a.slug}`} target="_blank" className="font-semibold text-[15px] text-text-primary hover:text-accent hover:underline block truncate">
                    {a.title}
                  </Link>
                  <p className="text-[13px] text-text-muted mt-0.5">{a.publishedAt ? formatDate(a.publishedAt) : ''}</p>
                </div>
                <span className="text-[14px] font-bold text-text-primary shrink-0">{formatNumber(a.viewCount)} <span className="text-text-muted font-normal text-[13px]">views</span></span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border dark:border-white/[0.08] py-16 text-center">
            <p className="text-[16px] font-semibold text-text-primary">No published articles yet</p>
            <p className="text-[14px] text-text-muted mt-1">Check back here once you publish content.</p>
          </div>
        )}
      </div>

      <div className="[&_*:focus]:outline-none">
        <div className="mb-4">
          <h3 className="text-[18px] font-bold text-text-primary">Monthly Views</h3>
        </div>
        <ResponsiveContainer width="100%" height={200} className="focus:outline-none focus-visible:outline-none">
          <LineChart data={data.monthlyTrend} margin={{ left: -25, right: 0, top: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={monthFormatter} />
            <YAxis tick={{ fontSize: 11 }} width={40} />
            <Tooltip labelFormatter={monthFormatter} formatter={(v: any) => [formatNumber(v), 'Views']} contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-surface)' }} />
            <Line type="monotone" dataKey="views" stroke="var(--accent)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-surface)' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
