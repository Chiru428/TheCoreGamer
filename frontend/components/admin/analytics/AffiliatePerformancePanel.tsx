'use client';

import Link from 'next/link';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatNumber } from '@/lib/utils';
import type { AffiliateStats } from '@/types';
import ExpandableSection from './ExpandableSection';
import { ShoppingCart } from 'lucide-react';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a78bfa', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
      <p style={{ fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{item.name}</p>
      <p style={{ color: 'var(--accent)' }}>{formatNumber(item.value)} clicks</p>
    </div>
  );
}

export default function AffiliatePerformancePanel({ data }: { data?: AffiliateStats }) {
  const clicksByStore = data?.clicksByStore ?? [];
  const topArticles = data?.topArticles ?? [];
  const totalClicks = data?.totalClicks ?? 0;

  return (
    <ExpandableSection title="Affiliate Performance" icon={<ShoppingCart className="w-4 h-4 text-accent" />}>
      <p className="text-sm text-text-muted mb-4">
        Affiliate link clicks over the last {data?.periodDays ?? 30} days. Total:{' '}
        <span className="font-semibold text-text-primary">{formatNumber(totalClicks)}</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          {clicksByStore.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={clicksByStore} dataKey="clicks" nameKey="store" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {clicksByStore.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend formatter={(v: string) => <span style={{ textTransform: 'capitalize' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-muted py-8 text-center">No affiliate clicks recorded yet.</p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-text-muted mb-2">By Store</p>
          {clicksByStore.map((s, i) => {
            const pct = totalClicks > 0 ? (s.clicks / totalClicks) * 100 : 0;
            return (
              <div key={s.store} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-text-primary capitalize">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  {s.store}
                </span>
                <span className="text-text-muted">{formatNumber(s.clicks)} clicks ({pct.toFixed(1)}%)</span>
              </div>
            );
          })}
          {clicksByStore.length === 0 && <p className="text-sm text-text-muted">No affiliate clicks recorded yet.</p>}
        </div>
      </div>

      <p className="text-sm font-medium text-text-muted mb-2">Top Articles by Affiliate Clicks</p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated">
            <tr>
              <th className="px-4 py-3 text-left text-text-muted font-medium">Article</th>
              <th className="px-4 py-3 text-left text-text-muted font-medium">Clicks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {topArticles.map((a, i) => (
              <tr key={a.articleId ?? i} className="hover:bg-bg-elevated/50">
                <td className="px-4 py-3">
                  {a.article ? (
                    <Link href={`/articles/${a.article.slug}`} className="text-text-primary hover:text-accent transition-colors font-medium">{a.article.title}</Link>
                  ) : (
                    <span className="text-text-muted">Unknown article</span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-primary">{formatNumber(a.clicks)}</td>
              </tr>
            ))}
            {topArticles.length === 0 && (
              <tr><td colSpan={2} className="px-4 py-6 text-center text-text-muted">No data yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </ExpandableSection>
  );
}
