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

  if (isSWRLoading || !data) {
    return (
      <div className="space-y-8 w-full" style={{ fontFamily: "'Rubik', sans-serif" }}>
        <Skeleton className="h-8 w-48 rounded-lg" />

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-bg-surface border border-border p-4 space-y-2">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          ))}
        </div>

        {/* Rank line */}
        <Skeleton className="h-5 w-3/4 rounded-md" />

        {/* Top Articles */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-32 rounded-md" />
          <div className="rounded-2xl bg-bg-surface border border-border overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`flex items-center justify-between p-5 ${i < 4 ? 'border-b border-border' : ''}`}>
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-5 w-3/4 rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
                <Skeleton className="h-5 w-20 rounded-md shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Views Chart */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-36 rounded-md" />
          <Skeleton className="w-full h-[200px] rounded-xl" />
        </div>
      </div>
    );
  }

  const monthFormatter = (m: any) => {
    const [, month] = String(m).split('-');
    return new Date(2000, Number(month) - 1, 1).toLocaleDateString('en-US', { month: 'short' });
  };

  return (
    <div className="space-y-8 w-full" style={{ fontFamily: "'Rubik', sans-serif" }}>


      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-bg-surface dark:bg-[#3A3F4A] border border-border p-4">
          <div className="flex items-center gap-2 mb-2 text-[14px] text-text-muted"><Eye className="w-4 h-4" />Total Views</div>
          <p className="text-[22px] font-bold text-text-primary">{formatNumber(data.totalViews)}</p>
        </div>
        <div className="rounded-2xl bg-bg-surface dark:bg-[#3A3F4A] border border-border p-4">
          <div className="flex items-center gap-2 mb-2 text-[14px] text-text-muted"><TrendingUp className="w-4 h-4" />This Month</div>
          <p className="text-[22px] font-bold text-text-primary">{formatNumber(data.viewsThisMonth)}</p>
        </div>
        <div className="rounded-2xl bg-bg-surface dark:bg-[#3A3F4A] border border-border p-4">
          <div className="flex items-center gap-2 mb-2 text-[14px] text-text-muted"><FileText className="w-4 h-4" />Articles</div>
          <p className="text-[22px] font-bold text-text-primary">{formatNumber(data.articleCount)}</p>
        </div>
        <div className="rounded-2xl bg-bg-surface dark:bg-[#3A3F4A] border border-border p-4">
          <div className="flex items-center gap-2 mb-2 text-[14px] text-text-muted"><Eye className="w-4 h-4" />Avg Views/Article</div>
          <p className="text-[22px] font-bold text-text-primary">{formatNumber(Math.round(data.avgViewsPerArticle))}</p>
        </div>
        <div className="rounded-2xl bg-bg-surface dark:bg-[#3A3F4A] border border-border p-4">
          <div className="flex items-center gap-2 mb-2 text-[14px] text-text-muted"><MessageSquare className="w-4 h-4" />Comments</div>
          <p className="text-[22px] font-bold text-text-primary">{formatNumber(data.totalComments)}</p>
        </div>
        <div className="rounded-2xl bg-bg-surface dark:bg-[#3A3F4A] border border-border p-4">
          <div className="flex items-center gap-2 mb-2 text-[14px] text-text-muted"><Star className="w-4 h-4" />Reviews</div>
          <p className="text-[22px] font-bold text-text-primary">{formatNumber(data.reviewCount)}</p>
        </div>
      </div>

      <p className="text-[16px] text-text-muted">
        You rank in the <span className="font-semibold text-text-primary">top {100 - data.percentileRank}%</span> of authors by total views
        (site average: {formatNumber(Math.round(data.siteAverageViews))} views/article).
      </p>

      <div>
        <h3 className="text-[20px] font-semibold text-text-primary mb-3">Top Articles</h3>
        {data.topArticles.length > 0 ? (
          <div className="rounded-2xl bg-bg-surface dark:bg-[#3A3F4A] border border-border dark:border-white/20 overflow-hidden">
            {data.topArticles.map((a, i) => (
              <div key={a.id} className={`flex items-center justify-between p-5 transition-colors hover:bg-accent/5 ${i < data.topArticles.length - 1 ? 'border-b border-border dark:border-white/20' : ''}`}>
                <div className="flex-1 min-w-0">
                  <Link href={`/${contentTypePath(a.contentType)}/${a.slug}`} target="_blank" className="font-medium text-[14px] sm:text-[16px] text-text-primary hover:underline block">
                    {a.title}
                  </Link>
                  <p className="text-[12px] sm:text-[14px] text-text-muted mt-1">{a.publishedAt ? formatDate(a.publishedAt) : ''}</p>
                </div>
                <span className="text-[16px] font-semibold text-text-primary shrink-0">{formatNumber(a.viewCount)} views</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[16px] text-text-muted">No published articles yet.</p>
        )}
      </div>

      <div className="[&_*:focus]:outline-none">
        <h3 className="text-[20px] font-semibold text-text-primary mb-6">Monthly Views</h3>
        <ResponsiveContainer width="100%" height={200} className="focus:outline-none focus-visible:outline-none">
          <LineChart data={data.monthlyTrend} margin={{ left: -25, right: 0, top: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={monthFormatter} />
            <YAxis tick={{ fontSize: 11 }} width={40} />
            <Tooltip labelFormatter={monthFormatter} formatter={(v: any) => [formatNumber(v), 'Views']} />
            <Line type="monotone" dataKey="views" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
