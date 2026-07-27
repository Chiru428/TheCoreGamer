'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { fetchPerformanceScores } from '@/lib/api';
import { formatNumber, formatDate } from '@/lib/utils';
import { AnalyticsTabs } from '@/components/admin/AnalyticsTabs';
import Badge from '@/components/ui/Badge';
import { TrendingUp, RefreshCw, TrendingDown, ExternalLink, Plus, Zap } from 'lucide-react';
import type { PerformanceScoreArticle } from '@/types';

function PanelCard({
  title,
  icon,
  borderColor,
  articles,
  emptyText,
  renderRight,
}: {
  title: string;
  icon: React.ReactNode;
  borderColor: string;
  articles: PerformanceScoreArticle[];
  emptyText: string;
  renderRight: (a: PerformanceScoreArticle) => React.ReactNode;
}) {
  return (
    <div className={`rounded-xl bg-bg-surface border border-border border-l-4 ${borderColor} p-5`}>
      <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {articles.length > 0 ? (
        <div className="space-y-3">
          {articles.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg bg-bg-elevated p-3">
              <div className="min-w-0">
                <Link
                  href={`/articles/${a.slug}`}
                  target="_blank"
                  className="font-medium text-text-primary hover:text-accent transition-colors flex items-center gap-1.5 truncate"
                >
                  {a.title} <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                </Link>
                <p className="text-xs text-text-muted mt-1">{formatNumber(a.viewCount)} views</p>
              </div>
              <div className="shrink-0">{renderRight(a)}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted py-4 text-center">{emptyText}</p>
      )}
    </div>
  );
}

export default function ContentPerformancePage() {
  const { data } = useSWR('performance-scores', () => fetchPerformanceScores().then(r => r.data));

  const trending = data?.trending ?? [];
  const needsRefresh = data?.needs_refresh ?? [];
  const underperforming = data?.underperforming ?? [];

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
      </div>
      <AnalyticsTabs />

      <h2 className="section-title-bar mb-6">Content Performance</h2>

      <div className="space-y-6">
        <PanelCard
          title="Trending Now"
          icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
          borderColor="border-l-emerald-500"
          articles={trending}
          emptyText="No trending articles in the last 7 days."
          renderRight={(a) => (
            <div className="flex items-center gap-3">
              <Badge variant="success">Score {a.score.toFixed(1)}</Badge>
              <Link
                href={`/articles/${a.slug}`}
                target="_blank"
                className="px-3 py-1.5 rounded bg-bg-elevated border border-border text-xs font-semibold text-text-primary hover:border-accent hover:text-accent transition-colors"
              >
                View
              </Link>
            </div>
          )}
        />

        <PanelCard
          title="Needs Refresh"
          icon={<RefreshCw className="w-4 h-4 text-amber-500" />}
          borderColor="border-l-amber-500"
          articles={needsRefresh}
          emptyText="No articles currently need a refresh."
          renderRight={(a) => (
            <div className="flex items-center gap-3">
              <span className={`text-xs ${a.daysSincePublished > 90 ? 'text-amber-500 font-medium' : 'text-text-muted'}`}>
                {formatDate(a.publishedAt)}
              </span>
              <Link
                href={`/admin/posts/${a.slug}/edit`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-bg-elevated border border-border text-xs font-semibold text-text-primary hover:border-accent hover:text-accent transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Assign Refresh
              </Link>
            </div>
          )}
        />

        <PanelCard
          title="Underperforming"
          icon={<TrendingDown className="w-4 h-4 text-red-500" />}
          borderColor="border-l-red-500"
          articles={underperforming}
          emptyText="No underperforming articles found."
          renderRight={(a) => (
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted">{a.daysSincePublished} days published</span>
              <Link
                href={`/admin/posts/${a.slug}/edit`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-bg-elevated border border-border text-xs font-semibold text-text-primary hover:border-accent hover:text-accent transition-colors"
              >
                <Zap className="w-3.5 h-3.5" /> Boost
              </Link>
            </div>
          )}
        />
      </div>
    </div>
  );
}
