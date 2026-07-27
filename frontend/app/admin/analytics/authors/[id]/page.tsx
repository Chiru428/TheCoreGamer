'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

import { fetchAuthorPerformance } from '@/lib/api';
import { formatNumber, formatDate, getInitials } from '@/lib/utils';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import Badge from '@/components/ui/Badge';
import { Eye, FileText, MessageSquare, Star, TrendingUp, ExternalLink } from 'lucide-react';

const roleBadge: Record<string, 'danger' | 'purple' | 'info' | 'default'> = {
  ADMIN: 'danger',
  EDITOR: 'purple',
  AUTHOR: 'info',
  USER: 'default',
  VISITOR: 'default',
};

function ComparisonBar({ label, yourValue, siteValue, format }: { label: string; yourValue: number; siteValue: number; format: (n: number) => string }) {
  const max = Math.max(yourValue, siteValue, 1);
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-text-muted mb-1">
        <span>{label}</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted w-16 shrink-0">You</span>
          <div className="flex-1 h-2 rounded-full bg-bg-elevated overflow-hidden">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(yourValue / max) * 100}%` }} />
          </div>
          <span className="text-[11px] font-semibold text-text-primary w-16 shrink-0 text-right">{format(yourValue)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted w-16 shrink-0">Site avg</span>
          <div className="flex-1 h-2 rounded-full bg-bg-elevated overflow-hidden">
            <div className="h-full rounded-full bg-text-dim" style={{ width: `${(siteValue / max) * 100}%` }} />
          </div>
          <span className="text-[11px] font-semibold text-text-muted w-16 shrink-0 text-right">{format(siteValue)}</span>
        </div>
      </div>
    </div>
  );
}

export default function AuthorPerformancePage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useSWR(
    id ? ['author-performance', id] : null,
    () => fetchAuthorPerformance(id).then(r => r.data)
  );

  if (isLoading) {
    return <div className="p-10 text-center text-text-muted">Loading...</div>;
  }
  if (error || !data) {
    return <div className="p-10 text-center text-danger">Failed to load author performance.</div>;
  }

  const { author } = data;
  const joinedDays = Math.floor((Date.now() - new Date(author.createdAt).getTime()) / (24 * 60 * 60 * 1000));

  const monthFormatter = (m: any) => {
    const [, month] = String(m).split('-');
    return new Date(2000, Number(month) - 1, 1).toLocaleDateString('en-US', { month: 'short' });
  };

  return (
    <div>
      <BreadcrumbNav
        crumbs={[
          { label: 'Analytics', href: '/admin/analytics' },
          { label: 'Author Breakdown', href: '/admin/analytics/authors' },
          { label: author.displayName },
        ]}
      />

      {/* Author header */}
      <div className="flex items-center gap-4 mt-4 mb-8">
        {author.avatarUrl ? (
          <img src={author.avatarUrl} alt={author.displayName} className="w-16 h-16 rounded-full" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-xl font-bold text-accent-light">
            {getInitials(author.displayName)}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-primary">{author.displayName}</h1>
            <Badge variant={roleBadge[author.role] ?? 'default'}>{author.role}</Badge>
          </div>
          <p className="text-sm text-text-muted mt-1">@{author.username} · Joined {joinedDays} days ago</p>
        </div>
      </div>

      {/* Stats grid 2x3 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl bg-bg-surface border border-border p-5">
          <div className="flex items-center gap-2 mb-2 text-sm text-text-muted"><Eye className="w-4 h-4" />Total Views</div>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(data.totalViews)}</p>
        </div>
        <div className="rounded-xl bg-bg-surface border border-border p-5">
          <div className="flex items-center gap-2 mb-2 text-sm text-text-muted"><TrendingUp className="w-4 h-4" />Views This Month</div>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(data.viewsThisMonth)}</p>
        </div>
        <div className="rounded-xl bg-bg-surface border border-border p-5">
          <div className="flex items-center gap-2 mb-2 text-sm text-text-muted"><FileText className="w-4 h-4" />Articles</div>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(data.articleCount)}</p>
        </div>
        <div className="rounded-xl bg-bg-surface border border-border p-5">
          <div className="flex items-center gap-2 mb-2 text-sm text-text-muted"><Eye className="w-4 h-4" />Avg Views/Article</div>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(Math.round(data.avgViewsPerArticle))}</p>
        </div>
        <div className="rounded-xl bg-bg-surface border border-border p-5">
          <div className="flex items-center gap-2 mb-2 text-sm text-text-muted"><MessageSquare className="w-4 h-4" />Comments Generated</div>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(data.totalComments)}</p>
        </div>
        <div className="rounded-xl bg-bg-surface border border-border p-5">
          <div className="flex items-center gap-2 mb-2 text-sm text-text-muted"><Star className="w-4 h-4" />Review Count</div>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(data.reviewCount)}</p>
          {data.avgReviewScore !== null && (
            <p className="text-xs text-text-muted mt-1">Avg score {data.avgReviewScore.toFixed(1)}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparison bars + percentile */}
        <div className="rounded-xl bg-bg-surface border border-border p-5">
          <h2 className="section-title-bar mb-4">Your Performance vs Site Average</h2>
          <div className="space-y-5">
            <ComparisonBar
              label="Avg Views per Article"
              yourValue={data.avgViewsPerArticle}
              siteValue={data.siteAverageViews}
              format={(n) => formatNumber(Math.round(n))}
            />
            <ComparisonBar
              label="Total Views"
              yourValue={data.totalViews}
              siteValue={data.siteAverageViews * data.articleCount}
              format={(n) => formatNumber(Math.round(n))}
            />
          </div>
          <p className="text-sm text-text-muted mt-5">
            You rank in the <span className="font-semibold text-text-primary">top {100 - data.percentileRank}%</span> of authors by total views.
          </p>
        </div>

        {/* Top 5 articles */}
        <div className="rounded-xl bg-bg-surface border border-border p-5">
          <h2 className="section-title-bar mb-2">Top Articles</h2>
          {data.topArticles.length > 0 ? (
            <div>
              {data.topArticles.map((a) => (
                <div key={a.id} className="card-list-item">
                  <div className="flex-1 min-w-0">
                    <Link href={`/articles/${a.slug}`} target="_blank" className="font-medium text-text-primary hover:text-accent transition-colors flex items-center gap-1.5 truncate">
                      {a.title} <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                    </Link>
                    <p className="text-xs text-text-muted mt-1">{a.publishedAt ? formatDate(a.publishedAt) : ''}</p>
                  </div>
                  <span className="text-sm font-semibold text-text-primary shrink-0">{formatNumber(a.viewCount)} views</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted py-4 text-center">No published articles yet.</p>
          )}
        </div>
      </div>

      {/* Monthly trend chart */}
      <div className="rounded-xl bg-bg-surface border border-border p-5 mt-6">
        <h2 className="section-title-bar mb-4">Monthly View Trend (Last 6 Months)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.monthlyTrend}>
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
