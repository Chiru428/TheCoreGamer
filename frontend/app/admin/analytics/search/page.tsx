'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { fetchSearchAnalytics } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import {
  Search, TrendingUp, AlertTriangle, Download, FileEdit
} from 'lucide-react';
import { AnalyticsTabs } from '@/components/admin/AnalyticsTabs';

type Period = '7d' | '30d' | '90d';

// -- Custom Recharts Tooltip ---------------------------------------------------
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '8px 14px',
      color: '#fff',
      fontSize: 13,
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 2, fontSize: 11 }}>{label}</p>
      <p style={{ fontWeight: 700, color: 'var(--accent)' }}>
        {formatNumber(payload[0].value)} searches
      </p>
    </div>
  );
}

// -- Stat card ----------------------------------------------------------------
function StatCard({ label, value, icon, accent }: { label: string; value: string | number; icon: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '20px 22px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: accent ? `${accent}20` : 'var(--accent-blue-dim, rgba(59,130,246,0.12))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
          {label}
        </p>
        <p style={{ fontSize: 22, fontWeight: 800, color: accent ?? 'var(--text-primary)', lineHeight: 1 }}>
          {typeof value === 'number' ? formatNumber(value) : value}
        </p>
      </div>
    </div>
  );
}

export default function SearchAnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');

  const { data: analytics, isLoading } = useSWR(
    ['search-analytics', period],
    () => fetchSearchAnalytics(period).then(r => r.data),
  );

  // -- CSV Export --------------------------------------------------------------
  const exportCSV = useCallback(() => {
    if (!analytics?.zeroResultQueries?.length) return;
    const rows = [
      ['Query', 'Times Searched', 'Last Seen'],
      ...analytics.zeroResultQueries.map(q => [
        `"${q.query.replace(/"/g, '""')}"`,
        q.count,
        q.lastSeen ? new Date(q.lastSeen).toLocaleDateString() : '',
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-gaps-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [analytics, period]);

  const periods: { label: string; value: Period }[] = [
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: '90D', value: '90d' },
  ];

  const gapPercent = analytics && analytics.totalSearches > 0
    ? Math.round((analytics.zeroResultCount / analytics.totalSearches) * 100)
    : 0;

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* -- Page header -- */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8, flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Period pills */}
          <div style={{
            display: 'flex', gap: 4, background: 'var(--bg2)',
            border: '1px solid var(--border)', borderRadius: 8, padding: 3,
          }}>
            {periods.map(p => (
              <button
                key={p.value}
                id={`period-${p.value}`}
                onClick={() => setPeriod(p.value)}
                style={{
                  padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.05em',
                  transition: 'all 0.15s ease',
                  background: period === p.value ? 'var(--accent)' : 'transparent',
                  color: period === p.value ? '#fff' : 'var(--text-muted)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Export button */}
          <button
            id="export-gaps-csv"
            onClick={exportCSV}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)', color: 'var(--text-muted)',
              fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
          >
            <Download size={13} />
            Export Gaps CSV
          </button>
        </div>
      </div>

      <AnalyticsTabs />

      {/* -- Stat cards -- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard
          label="Total Searches"
          value={analytics?.totalSearches ?? 0}
          icon={<Search size={17} color="var(--accent)" />}
        />
        <StatCard
          label="Unique Queries"
          value={analytics?.uniqueQueries ?? 0}
          icon={<TrendingUp size={17} color="#a78bfa" />}
          accent="#a78bfa"
        />
        <StatCard
          label="Zero Results"
          value={analytics?.zeroResultCount ?? 0}
          icon={<AlertTriangle size={17} color="#ef4444" />}
          accent="#ef4444"
        />
        <StatCard
          label="Gap Rate"
          value={`${gapPercent}%`}
          icon={<AlertTriangle size={17} color={gapPercent > 20 ? '#ef4444' : '#f59e0b'} />}
          accent={gapPercent > 20 ? '#ef4444' : '#f59e0b'}
        />
      </div>

      {/* -- Panel 1: Search Volume Chart (full width) -- */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 14, padding: '22px 24px', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <TrendingUp size={16} color="var(--accent)" />
          <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
            Search Volume Trend
          </h2>
        </div>

        {isLoading ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Loading chart...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analytics?.searchVolumeTrend ?? []} margin={{ top: 4, right: 10, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => {
                  const d = new Date(v);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
                interval={period === '7d' ? 0 : period === '30d' ? 4 : 9}
              />
              <YAxis
                width={28}
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)', strokeDasharray: '4 4' }} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--accent, #3b82f6)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* -- Panels 2 & 3: Side by side -- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Panel 2 — Top Queries */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Search size={14} color="var(--accent)" />
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
              Top Queries
            </h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, width: 32 }}>#</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Query</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Searches</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Avg Results</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading...
                    </td>
                  </tr>
                )}
                {!isLoading && !analytics?.topQueries?.length && (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No search data yet for this period.
                    </td>
                  </tr>
                )}
                {(analytics?.topQueries ?? []).map((q, i) => (
                  <tr
                    key={q.query}
                    style={{
                      background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg2, var(--bg-elevated))',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(59,130,246,0.06)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg2, var(--bg-elevated))'}
                  >
                    <td style={{ padding: '9px 12px', color: 'var(--text-muted)', fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ padding: '9px 12px', color: 'var(--text-primary)', fontFamily: 'monospace', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.query}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                      {formatNumber(q.count)}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: q.avgResults === 0 ? '#ef4444' : 'var(--text-muted)' }}>
                      {q.avgResults.toFixed(1)}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      <Link
                        id={`create-article-${i}`}
                        href={`/admin/posts/new?prefill=${encodeURIComponent(q.query)}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 9px', borderRadius: 5,
                          border: '1px solid var(--border)',
                          color: 'var(--text-muted)', fontSize: 11, fontWeight: 600,
                          textDecoration: 'none', transition: 'all 0.15s',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--accent)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)'; }}
                      >
                        <FileEdit size={10} />
                        Create Article
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel 3 — Content Gaps */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.04)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <AlertTriangle size={14} color="#ef4444" />
            <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#ef4444' }}>
              Content Gaps — No Results Found
            </h2>
          </div>

          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {isLoading && (
              <p style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Loading...
              </p>
            )}
            {!isLoading && !analytics?.zeroResultQueries?.length && (
              <p style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                🎉 No content gaps found for this period!
              </p>
            )}
            {(analytics?.zeroResultQueries ?? []).map((q, i) => (
              <div
                key={q.query}
                id={`gap-row-${i}`}
                style={{
                  padding: '12px 18px',
                  borderLeft: '3px solid #ef4444',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg2, var(--bg-elevated))',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(239,68,68,0.05)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg2, var(--bg-elevated))'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: 'monospace', fontSize: 13, fontWeight: 600,
                    color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    marginBottom: 3,
                  }}>
                    {q.query}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>{formatNumber(q.count)}×</span>
                    {' searched'}
                    {q.lastSeen && (
                      <> · last {new Date(q.lastSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                    )}
                  </p>
                </div>
                <Link
                  id={`write-article-${i}`}
                  href={`/admin/posts/new?prefill=${encodeURIComponent(q.query)}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
                    padding: '4px 10px', borderRadius: 6,
                    border: '1px solid rgba(239,68,68,0.4)',
                    color: '#ef4444', fontSize: 11, fontWeight: 600,
                    textDecoration: 'none', transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(239,68,68,0.12)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
                >
                  <FileEdit size={10} />
                  Write Article
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
