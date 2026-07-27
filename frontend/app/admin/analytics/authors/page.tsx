'use client';
import useSWR from 'swr';
import Link from 'next/link';
import Image from 'next/image';
import { fetchAuthorAnalytics } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { AnalyticsTabs } from '@/components/admin/AnalyticsTabs';

export default function AuthorAnalyticsPage() {
  const { data, isLoading } = useSWR('analytics-authors', () =>
    fetchAuthorAnalytics().then(r => r.data ?? [])
  );
  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
      </div>
      <AnalyticsTabs />
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated">
            <tr>
              {['Author', 'Articles', 'Total Views', 'Avg Views', 'Comments', 'Top Article', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-text-muted font-medium text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((a: any) => (
              <tr key={a.authorId} className="border-t border-border hover:bg-bg-elevated/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {a.avatarUrl
                      ? <Image src={a.avatarUrl} alt={a.displayName} width={28} height={28} className="rounded-full" />
                      : <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">{a.displayName[0]}</div>
                    }
                    <span className="font-medium text-text-primary">{a.displayName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-text-muted">{a.articleCount}</td>
                <td className="px-4 py-3 text-text-muted">{formatNumber(a.totalViews)}</td>
                <td className="px-4 py-3 text-text-muted">{formatNumber(a.avgViewsPerArticle)}</td>
                <td className="px-4 py-3 text-text-muted">{formatNumber(a.totalComments)}</td>
                <td className="px-4 py-3">
                  {a.topArticle && (
                    <Link href={`/articles/${a.topArticle.slug}`} className="text-accent hover:underline text-xs" target="_blank">
                      {a.topArticle.title.slice(0, 40)}{a.topArticle.title.length > 40 ? '…' : ''}
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/analytics/authors/${a.authorId}`}
                    className="inline-flex items-center px-2.5 py-1 rounded bg-bg-elevated border border-border text-text-muted text-xs font-medium hover:border-accent hover:text-accent transition-colors whitespace-nowrap"
                  >
                    View Performance
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
