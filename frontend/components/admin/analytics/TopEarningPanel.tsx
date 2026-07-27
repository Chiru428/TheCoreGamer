'use client';

import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatNumber, formatDate } from '@/lib/utils';
import type { TopEarningArticle } from '@/types';
import ExpandableSection from './ExpandableSection';
import { TrendingUp } from 'lucide-react';

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 2, fontSize: 11 }}>{item.title}</p>
      <p style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatNumber(item.viewCount)} views</p>
    </div>
  );
}

export default function TopEarningPanel({ data }: { data?: TopEarningArticle[] }) {
  const articles = (data ?? []).filter(Boolean);
  const top10 = articles.slice(0, 10).map((a) => ({ ...a, viewCount: Number(a.viewCount) }));

  return (
    <ExpandableSection title="Top Earning Articles" icon={<TrendingUp className="w-4 h-4 text-accent" />}>
      {top10.length > 0 && (
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={top10} margin={{ top: 8, right: 10, bottom: 60, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="title"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={80}
                tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 18)}…` : v)}
              />
              <YAxis width={40} tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-elevated)' }} />
              <Bar dataKey="viewCount" fill="var(--accent, #3b82f6)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated">
            <tr>
              <th className="px-4 py-3 text-left text-text-muted font-medium">Title</th>
              <th className="px-4 py-3 text-left text-text-muted font-medium">Author</th>
              <th className="px-4 py-3 text-left text-text-muted font-medium">Views</th>
              <th className="px-4 py-3 text-left text-text-muted font-medium">Date Published</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {articles.map((a) => (
              <tr key={a.id} className="hover:bg-bg-elevated/50">
                <td className="px-4 py-3">
                  <Link href={`/articles/${a.slug}`} className="text-text-primary hover:text-accent transition-colors font-medium">{a.title}</Link>
                </td>
                <td className="px-4 py-3 text-text-muted">{a.author?.displayName ?? '—'}</td>
                <td className="px-4 py-3 text-text-primary">{formatNumber(Number(a.viewCount ?? 0))}</td>
                <td className="px-4 py-3 text-text-muted">{a.publishedAt ? formatDate(a.publishedAt) : '—'}</td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-text-muted">No data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </ExpandableSection>
  );
}
