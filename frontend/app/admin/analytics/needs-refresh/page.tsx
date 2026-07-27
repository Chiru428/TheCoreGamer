'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { RefreshCw, Clock, ExternalLink, Calendar, Plus } from 'lucide-react';

import Badge from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';

interface NeedsRefreshArticle {
  id: string;
  slug: string;
  title: string;
  publishedAt: string;
  viewCount: number;
  lastMajorUpdateAt: string | null;
  lastMajorUpdateNote: string | null;
  contentType: string;
  author: { id: string; displayName: string; username: string } | null;
  daysSinceUpdate: number | null;
  daysSincePublished: number;
}

export default function NeedsRefreshPage() {
  const { data, error, isLoading } = useSWR<{ success: boolean; data: NeedsRefreshArticle[] }>(
    '/api/admin/analytics/needs-refresh',
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <BreadcrumbNav crumbs={[{ label: 'Analytics', href: '/admin/analytics' }, { label: 'Needs Refresh' }]} />

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 text-accent" />
          <h1 className="text-xl font-bold text-text-primary m-0 uppercase tracking-wider">
            Articles Needing Refresh
          </h1>
        </div>
      </div>

      <div className="bg-bg-surface border border-border rounded-xl p-5 mb-6">
        <p className="text-sm text-text-muted m-0">
          Showing published articles older than 90 days with over 500 views that haven't had a major update in the last 60 days. Sorted by highest view count.
        </p>
      </div>

      {isLoading ? (
        <div className="p-10 text-center text-text-muted">Loading...</div>
      ) : error ? (
        <div className="p-10 text-center text-danger">Failed to load articles</div>
      ) : data?.data && data.data.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-bg-surface">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-bg-elevated/50 text-text-muted">
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">Title</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">Published</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">Views</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px]">Last Updated</th>
                <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.data.map((article) => {
                const needsUpdateWarning = article.daysSinceUpdate === null || article.daysSinceUpdate > 60;
                
                return (
                  <tr key={article.id} className="hover:bg-bg-elevated transition-colors">
                    <td className="px-5 py-3 max-w-[300px] truncate">
                      <div className="flex flex-col gap-1">
                        <Link href={`/articles/${article.slug}`} target="_blank" className="font-semibold text-text-primary hover:text-accent transition-colors flex items-center gap-1.5 truncate">
                          {article.title} <ExternalLink className="w-3 h-3 shrink-0" />
                        </Link>
                        <div className="flex items-center gap-2 text-[11px] text-text-muted">
                          <Badge variant="default" className="text-[9px] px-1.5 py-0">{article.contentType}</Badge>
                          {article.author?.displayName}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-text-muted">
                      <div className="flex flex-col">
                        <span>{formatDate(article.publishedAt)}</span>
                        <span className="text-[10px] text-text-dim">{article.daysSincePublished} days ago</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium text-text-primary">
                      {article.viewCount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {needsUpdateWarning ? (
                          <div className="flex flex-col text-amber-500">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              {article.lastMajorUpdateAt ? `${article.daysSinceUpdate} days ago` : 'Never updated'}
                            </span>
                            {article.lastMajorUpdateAt && (
                              <span className="text-[10px] opacity-70 truncate max-w-[150px]">
                                {formatDate(article.lastMajorUpdateAt)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-text-muted">
                            {formatDate(article.lastMajorUpdateAt!)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/posts/${article.slug}/edit`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-bg-elevated border border-border text-xs font-semibold text-text-primary hover:border-accent hover:text-accent transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Assign Refresh
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center p-12 bg-bg-surface border border-border rounded-xl">
          <p className="text-text-muted m-0">No articles currently require refreshing.</p>
        </div>
      )}
    </div>
  );
}
