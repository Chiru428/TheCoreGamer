'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  fetchAnalytics,
  fetchAdSenseReport,
  fetchAnalyticsTraffic,
  fetchTopEarningArticles,
  fetchAffiliateStats,
  fetchSearchMisses,
  exportAnalyticsCSV,
  fetchGA4Status,
} from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { BarChart3, DollarSign, Eye, MousePointer, Download, TrendingUp, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { AnalyticsTabs } from '@/components/admin/AnalyticsTabs';
import { useUIStore } from '@/store/uiStore';
import TopEarningPanel from '@/components/admin/analytics/TopEarningPanel';
import AffiliatePerformancePanel from '@/components/admin/analytics/AffiliatePerformancePanel';
import SearchGapsPanel from '@/components/admin/analytics/SearchGapsPanel';
import HeatmapsPanel from '@/components/admin/analytics/HeatmapsPanel';
import LiveRightNowPanel from '@/components/admin/analytics/LiveRightNowPanel';
import LiveCommentActivity from '@/components/admin/analytics/LiveCommentActivity';

export default function AdminAnalyticsPage() {
  const { addToast } = useUIStore();
  const [trafficRange, setTrafficRange] = useState<'day' | 'week' | 'month'>('week');
  const [isExporting, setIsExporting] = useState(false);
  const [ga4Status, setGa4Status] = useState<any>(null);
  const [testingGA4, setTestingGA4] = useState(false);

  const { data: analytics } = useSWR('analytics', () => fetchAnalytics().then(r => r.data));
  const { data: adsense } = useSWR('adsense', () => fetchAdSenseReport().then(r => r.data));
  const { data: traffic } = useSWR(['analytics-traffic', trafficRange], () =>
    fetchAnalyticsTraffic({ range: trafficRange }).then(r => r.data)
  );
  const { data: topEarning } = useSWR('top-earning', () => fetchTopEarningArticles().then(r => r.data));
  const { data: affiliateStats } = useSWR('affiliate-stats', () => fetchAffiliateStats().then(r => r.data));
  const { data: searchMisses } = useSWR('search-misses', () => fetchSearchMisses().then(r => r.data));

  const handleTestGA4 = async () => {
    setTestingGA4(true);
    try {
      const res = await fetchGA4Status();
      setGa4Status(res.data);
    } catch {
      setGa4Status({ step: 'fetch-error', message: 'Failed to reach the backend. Make sure the backend server is running.' });
    }
    setTestingGA4(false);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportAnalyticsCSV();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      addToast({ type: 'error', message: 'Export failed' });
    }
    setIsExporting(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" loading={isExporting} onClick={handleExport} icon={<Download className="w-4 h-4" />}>
            Export CSV
          </Button>
        </div>
      </div>
      <AnalyticsTabs />

      <LiveRightNowPanel />
      <LiveCommentActivity />

      {/* Traffic overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl bg-bg-surface border border-border p-5">
          <div className="flex items-center gap-2 mb-2 text-sm text-text-muted"><Eye className="w-4 h-4" />Unique Visitors</div>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(analytics?.uniqueVisitors ?? 0)}</p>
        </div>
        <div className="rounded-xl bg-bg-surface border border-border p-5">
          <div className="flex items-center gap-2 mb-2 text-sm text-text-muted"><BarChart3 className="w-4 h-4" />Bounce Rate</div>
          <p className="text-2xl font-bold text-text-primary">{((analytics?.bounceRate ?? 0) * 100).toFixed(1)}%</p>
        </div>
        <div className="rounded-xl bg-bg-surface border border-border p-5">
          <div className="flex items-center gap-2 mb-2 text-sm text-text-muted"><MousePointer className="w-4 h-4" />Avg Session</div>
          <p className="text-2xl font-bold text-text-primary">{Math.floor((analytics?.sessionDuration ?? 0) / 60)}m</p>
        </div>
      </div>

      {/* GA4 Connection Status */}
      <div className="rounded-xl bg-bg-surface border border-border p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {ga4Status?.step === 'success' ? (
              <Wifi className="w-4 h-4 text-[var(--brand-green)]" />
            ) : ga4Status ? (
              <WifiOff className="w-4 h-4 text-red-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-text-muted" />
            )}
            <span className="text-sm font-medium text-text-primary">GA4 Connection</span>
            {ga4Status?.step === 'success' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--brand-green)]/10 text-[var(--brand-green)]">Connected</span>
            )}
            {ga4Status && ga4Status.step !== 'success' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Error: {ga4Status.step}</span>
            )}
          </div>
          <Button size="sm" variant="outline" loading={testingGA4} onClick={handleTestGA4}>
            {ga4Status ? 'Re-test GA4' : 'Test GA4 Connection'}
          </Button>
        </div>
        {ga4Status && (
          <div className="mt-3 space-y-1">
            <p className="text-sm text-text-muted">{ga4Status.message}</p>
            {ga4Status.hint && (
              <p className="text-xs text-amber-400 bg-amber-400/10 rounded px-3 py-2 mt-2">{ga4Status.hint}</p>
            )}
            {ga4Status.service_account && (
              <p className="text-xs text-text-muted">Service account: <span className="font-mono text-text-primary">{ga4Status.service_account}</span></p>
            )}
            {ga4Status.property && (
              <p className="text-xs text-text-muted">Property: <span className="font-mono text-text-primary">{ga4Status.property}</span></p>
            )}
          </div>
        )}
      </div>

      {/* Traffic time-series */}
      <div className="rounded-xl bg-bg-surface border border-border p-6 mb-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            <h2 className="text-lg font-bold text-text-primary">Traffic Over Time</h2>
          </div>
          <div className="flex gap-2">
            {(['day', 'week', 'month'] as const).map(r => (
              <button
                key={r}
                onClick={() => setTrafficRange(r)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${trafficRange === r ? 'bg-accent/10 text-accent-light' : 'text-text-muted hover:bg-bg-elevated'}`}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {traffic?.data && traffic.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated">
                <tr>
                  <th className="px-4 py-2 text-left text-text-muted font-medium">Date</th>
                  <th className="px-4 py-2 text-left text-text-muted font-medium">Page Views</th>
                  <th className="px-4 py-2 text-left text-text-muted font-medium">Unique Visitors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {traffic.data.map((row, i) => (
                  <tr key={i} className="hover:bg-bg-elevated/50">
                    <td className="px-4 py-2 text-text-muted">{row.date}</td>
                    <td className="px-4 py-2 text-text-primary">{formatNumber(row.pageViews)}</td>
                    <td className="px-4 py-2 text-text-primary">{formatNumber(row.uniqueVisitors)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-text-muted py-4 text-center">No traffic data yet.</p>
        )}
      </div>

      {/* AdSense */}
      {adsense && (
        <>
          <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-accent" />AdSense Revenue</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl bg-bg-surface border border-border p-5">
              <p className="text-xs text-text-muted mb-1">Estimated Earnings</p>
              <p className="text-xl font-bold text-accent-green">${(adsense.estimatedEarnings || 0).toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-bg-surface border border-border p-5">
              <p className="text-xs text-text-muted mb-1">RPM</p>
              <p className="text-xl font-bold text-text-primary">${(adsense.rpm || 0).toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-bg-surface border border-border p-5">
              <p className="text-xs text-text-muted mb-1">Impressions</p>
              <p className="text-xl font-bold text-text-primary">{formatNumber(adsense.impressions || 0)}</p>
            </div>
            <div className="rounded-xl bg-bg-surface border border-border p-5">
              <p className="text-xs text-text-muted mb-1">CTR</p>
              <p className="text-xl font-bold text-text-primary">{((adsense.ctr || 0) * 100).toFixed(2)}%</p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border mb-8">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated">
                <tr><th className="px-4 py-3 text-left text-text-muted font-medium">Ad Unit</th><th className="px-4 py-3 text-left text-text-muted font-medium">Earnings</th><th className="px-4 py-3 text-left text-text-muted font-medium">Impressions</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(adsense.perUnit || []).map(u => (
                  <tr key={u.unitId} className="hover:bg-bg-elevated/50">
                    <td className="px-4 py-3 text-text-primary font-mono text-xs">{u.unitId}</td>
                    <td className="px-4 py-3 text-accent-green">${(u.earnings || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-text-muted">{formatNumber(u.impressions || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Richer analytics panels */}
      <TopEarningPanel data={topEarning} />
      <AffiliatePerformancePanel data={affiliateStats} />
      <SearchGapsPanel data={searchMisses} />
      <HeatmapsPanel />
    </div>
  );
}
