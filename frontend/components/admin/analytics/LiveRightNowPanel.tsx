'use client';

import useSWR from 'swr';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchRealtimeAnalytics, fetchLiveActivity } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { Radio } from 'lucide-react';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a78bfa', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

function SourceTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
      <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</p>
      <p style={{ color: 'var(--accent)' }}>{formatNumber(item.value)} users</p>
    </div>
  );
}

export default function LiveRightNowPanel() {
  const { data: realtime } = useSWR('realtime-analytics', () => fetchRealtimeAnalytics().then(r => r.data), {
    refreshInterval: 30000,
  });
  const { data: liveActivity } = useSWR('live-activity', () => fetchLiveActivity().then(r => r.data), {
    refreshInterval: 30000,
  });

  const topPages = liveActivity?.pages ?? [];
  const trafficSources = realtime?.trafficSources ?? [];
  const maxActive = Math.max(1, ...topPages.map(p => p.activeCount));

  return (
    <div className="rounded-xl bg-bg-surface border border-accent/40 p-6 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="live-dot" />
        <Radio className="w-4 h-4 text-accent" />
        <span className="text-3xl font-bold text-accent">{formatNumber(realtime?.activeUsers ?? 0)}</span>
        <span className="text-sm font-semibold text-text-muted uppercase tracking-wide">Readers Online</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm font-medium text-text-muted mb-3">Top Pages Now</p>
          {topPages.length > 0 ? (
            <div className="space-y-2">
              {topPages.slice(0, 8).map((p) => (
                <div key={p.slug} className="text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-text-primary truncate pr-2">{p.title}</span>
                    <span className="text-text-muted shrink-0">{formatNumber(p.activeCount)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${(p.activeCount / maxActive) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted py-4 text-center">No active readers right now.</p>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-text-muted mb-3">Traffic Sources</p>
          {trafficSources.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={trafficSources} dataKey="users" nameKey="source" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {trafficSources.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<SourceTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text-muted py-4 text-center">No traffic source data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
