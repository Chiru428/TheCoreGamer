'use client';

import { useState } from 'react';import { Spinner } from '@/components/ui/Spinner';

import useSWR from 'swr';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { fetchNewsletterSubscribers, fetchNewsletterStats, sendWeeklyRoundup, sendCampaign } from '@/lib/api';
import { useUIStore } from '@/store/uiStore';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { formatDate, formatNumber } from '@/lib/utils';
import { Mail, Send, Users, Megaphone, ChevronDown, TrendingUp, MousePointerClick } from 'lucide-react';

const GENRES = ['Action', 'RPG', 'Shooter', 'Racing', 'Simulation', 'Strategy'];
const PLATFORMS = ['PC', 'PS5', 'Xbox', 'Switch', 'Mobile'];

const EMPTY_SPONSORED = { sponsor: '', headline: '', body: '', ctaText: '', ctaUrl: '', imageUrl: '' };

function ChartTooltip({ active, payload, label, suffix }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
      padding: '8px 14px', color: '#fff', fontSize: 13, boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 2, fontSize: 11 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ fontWeight: 700, color: p.color }}>
          {formatNumber(p.value)}{suffix ?? ''}
        </p>
      ))}
    </div>
  );
}

export default function AdminNewsletterPage() {
  const { addToast } = useUIStore();
  const { data, isLoading } = useSWR('admin-newsletter', () => fetchNewsletterSubscribers().then(r => r.data));
  const { data: stats, isLoading: statsLoading } = useSWR('admin-newsletter-stats', () => fetchNewsletterStats().then(r => r.data));

  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  // Campaign composer state
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [isSendingRoundup, setIsSendingRoundup] = useState(false);
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignBody, setCampaignBody] = useState('');

  // Sponsored content state
  const [showSponsoredSection, setShowSponsoredSection] = useState(false);
  const [includeSponsored, setIncludeSponsored] = useState(false);
  const [sponsoredContent, setSponsoredContent] = useState(EMPTY_SPONSORED);

  const handleRoundup = async () => {
    setIsSendingRoundup(true);
    const res = await sendWeeklyRoundup();
    setIsSendingRoundup(false);
    if (res.success) addToast({ type: 'success', message: 'Weekly roundup sent!' });
    else addToast({ type: 'error', message: res.error || 'Failed' });
  };

  const handleSendCampaign = async () => {
    if (!campaignSubject.trim() || !campaignBody.trim()) {
      addToast({ type: 'error', message: 'Subject and body are required.' });
      return;
    }
    if (includeSponsored) {
      const { sponsor, headline, body, ctaText, ctaUrl } = sponsoredContent;
      if (!sponsor.trim() || !headline.trim() || !body.trim() || !ctaText.trim() || !ctaUrl.trim()) {
        addToast({ type: 'error', message: 'Fill in all sponsored content fields or disable the toggle.' });
        return;
      }
    }
    setIsSendingCampaign(true);
    const res = await sendCampaign({
      subject: campaignSubject,
      body: campaignBody,
      genres: selectedGenres.length > 0 ? selectedGenres : undefined,
      platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
      sponsoredContent: includeSponsored ? sponsoredContent : undefined,
    });
    setIsSendingCampaign(false);
    if (res.success) {
      addToast({ type: 'success', message: 'Campaign queued for delivery!' });
      setShowCampaignModal(false);
      setCampaignSubject('');
      setCampaignBody('');
      setIncludeSponsored(false);
      setSponsoredContent(EMPTY_SPONSORED);
    } else {
      addToast({ type: 'error', message: res.error || 'Failed to send campaign' });
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Newsletter</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" icon={<Megaphone className="w-4 h-4" />} onClick={() => setShowCampaignModal(true)}>
            Send Campaign
          </Button>
          <Button size="sm" loading={isSendingRoundup} icon={<Send className="w-4 h-4" />} onClick={handleRoundup}>
            Send Weekly Roundup
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-6">
        {(['overview', 'analytics'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab ? 'text-accent border-accent' : 'text-text-muted border-transparent hover:text-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="rounded-xl bg-bg-surface border border-border p-6 mb-6">
            <div className="mb-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-text-primary mb-2">Segment by Genre</p>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(g => (
                    <button
                      key={g}
                      onClick={() => setSelectedGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedGenres.includes(g) ? 'bg-accent text-white' : 'bg-bg-elevated text-text-muted hover:text-text-primary'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary mb-2">Segment by Platform</p>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p}
                      onClick={() => setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedPlatforms.includes(p) ? 'bg-accent text-white' : 'bg-bg-elevated text-text-muted hover:text-text-primary'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-2 pt-4 border-t border-border">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><Users className="w-5 h-5 text-accent-light" /></div>
              <div>
                <p className="text-sm text-text-muted">Total Subscribers</p>
                <p className="text-2xl font-bold text-text-primary">{formatNumber(data?.count ?? 0)}</p>
              </div>
            </div>
            {(selectedGenres.length > 0 || selectedPlatforms.length > 0) && (
              <p className="text-xs text-text-muted mt-2">
                Campaigns and roundups will be segmented to subscribers matching the selected genres/platforms.
              </p>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated">
                <tr>
                  <th className="px-4 py-3 text-left text-text-muted font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-text-muted font-medium">Status</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-text-muted font-medium">Subscribed</th>
                </tr>
              </thead>
              {!isLoading && (
                <tbody className="divide-y divide-border">
                  {(data?.subscribers || []).map(s => (
                    <tr key={s.id} className="hover:bg-bg-elevated/50">
                      <td className="px-4 py-3 text-text-primary min-w-[200px] flex items-center gap-2"><Mail className="w-4 h-4 text-text-dim" />{s.email}</td>
                      <td className="px-4 py-3">{s.confirmed ? <span className="text-emerald-400 text-xs font-medium">Confirmed</span> : <span className="text-yellow-400 text-xs font-medium">Pending</span>}</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-text-muted whitespace-nowrap">{formatDate(s.subscribedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
            {isLoading && (
              <div className="p-12 flex flex-col items-center justify-center text-text-muted">
                <Spinner className="w-8 h-8 animate-spin mb-4 text-accent" />
                <p>Loading subscribers...</p>
              </div>
            )}
            {!isLoading && (!data?.subscribers || data.subscribers.length === 0) && (
              <div className="p-8 text-center text-text-muted">No subscribers found</div>
            )}
          </div>
        </>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Open rate trend */}
          <div className="rounded-xl bg-bg-surface border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-accent" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">Open Rate by Send</h2>
            </div>
            {statsLoading ? (
              <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">Loading chart...</div>
            ) : !stats?.history?.length ? (
              <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">No campaigns sent yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={[...stats.history].reverse().map(h => ({ ...h, openRatePct: Math.round(h.openRate * 1000) / 10 }))} margin={{ top: 4, right: 10, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="sentAt"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => {
                      const d = new Date(v);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                  />
                  <YAxis width={36} tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip content={<ChartTooltip suffix="%" />} cursor={{ stroke: 'var(--border)', strokeDasharray: '4 4' }} />
                  <Line type="monotone" dataKey="openRatePct" name="Open Rate" stroke="var(--accent, #3b82f6)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Click rate per send */}
          <div className="rounded-xl bg-bg-surface border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <MousePointerClick className="w-4 h-4 text-accent" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">Click Rate per Send</h2>
            </div>
            {statsLoading ? (
              <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">Loading chart...</div>
            ) : !stats?.history?.length ? (
              <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">No campaigns sent yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[...stats.history].reverse().map(h => ({ ...h, clickRatePct: Math.round(h.clickRate * 1000) / 10 }))} margin={{ top: 4, right: 10, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="sentAt"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => {
                      const d = new Date(v);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                  />
                  <YAxis width={36} tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip content={<ChartTooltip suffix="%" />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="clickRatePct" name="Click Rate" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Subscriber growth */}
          <div className="rounded-xl bg-bg-surface border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-accent" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">Subscriber Growth (Last 30 Days)</h2>
            </div>
            {statsLoading ? (
              <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">Loading chart...</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats?.subscriberGrowth ?? []} margin={{ top: 4, right: 10, bottom: 4, left: 0 }}>
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
                    interval={4}
                  />
                  <YAxis width={36} tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)', strokeDasharray: '4 4' }} />
                  <Line type="monotone" dataKey="total" name="Total Subscribers" stroke="#34d399" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Send history table */}
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated">
                <tr>
                  <th className="px-4 py-3 text-left text-text-muted font-medium">Subject</th>
                  <th className="px-4 py-3 text-left text-text-muted font-medium">Sent</th>
                  <th className="px-4 py-3 text-right text-text-muted font-medium">Recipients</th>
                  <th className="px-4 py-3 text-right text-text-muted font-medium">Open Rate</th>
                  <th className="px-4 py-3 text-right text-text-muted font-medium">Click Rate</th>
                  <th className="px-4 py-3 text-left text-text-muted font-medium">Sponsor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(stats?.history ?? []).map(h => (
                  <tr key={h.id} className="hover:bg-bg-elevated/50">
                    <td className="px-4 py-3 text-text-primary max-w-[260px] truncate">{h.subject}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDate(h.sentAt)}</td>
                    <td className="px-4 py-3 text-right text-text-primary">{formatNumber(h.recipientCount)}</td>
                    <td className="px-4 py-3 text-right text-accent font-medium">{(h.openRate * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right text-text-primary">{(h.clickRate * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-text-muted">{h.hasSponsored ? h.sponsorName || '—' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!statsLoading && !stats?.history?.length && (
              <div className="p-8 text-center text-text-muted">No campaigns sent yet</div>
            )}
          </div>
        </div>
      )}

      {/* Campaign Composer Modal */}
      <Modal isOpen={showCampaignModal} onClose={() => setShowCampaignModal(false)} title="Send Campaign">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Subject</label>
            <input
              type="text"
              value={campaignSubject}
              onChange={e => setCampaignSubject(e.target.value)}
              placeholder="e.g. This Week's Top Gaming Deals"
              className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border text-text-primary text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Body (HTML or plain text)</label>
            <textarea
              value={campaignBody}
              onChange={e => setCampaignBody(e.target.value)}
              rows={8}
              placeholder="Write your campaign content here…"
              className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border text-text-primary text-sm outline-none focus:border-accent resize-y font-mono"
            />
          </div>
          {(selectedGenres.length > 0 || selectedPlatforms.length > 0) && (
            <p className="text-xs text-text-muted">
              Sending to subscribers matching: {[...selectedGenres, ...selectedPlatforms].join(', ')}
            </p>
          )}

          {/* Sponsored Content accordion */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSponsoredSection(s => !s)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-bg-elevated text-left"
            >
              <span className="text-sm font-medium text-text-primary">Sponsored Content</span>
              <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${showSponsoredSection ? 'rotate-180' : ''}`} />
            </button>
            {showSponsoredSection && (
              <div className="p-3 space-y-3">
                <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSponsored}
                    onChange={e => setIncludeSponsored(e.target.checked)}
                    className="rounded border-border"
                  />
                  Include a sponsored section in this campaign
                </label>
                {includeSponsored && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1">Sponsor Name</label>
                      <input
                        type="text"
                        value={sponsoredContent.sponsor}
                        onChange={e => setSponsoredContent(s => ({ ...s, sponsor: e.target.value }))}
                        placeholder="e.g. Acme Studios"
                        className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border text-text-primary text-sm outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1">CTA Text</label>
                      <input
                        type="text"
                        value={sponsoredContent.ctaText}
                        onChange={e => setSponsoredContent(s => ({ ...s, ctaText: e.target.value }))}
                        placeholder="e.g. Learn More"
                        className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border text-text-primary text-sm outline-none focus:border-accent"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-text-muted mb-1">Headline</label>
                      <input
                        type="text"
                        value={sponsoredContent.headline}
                        onChange={e => setSponsoredContent(s => ({ ...s, headline: e.target.value }))}
                        placeholder="e.g. New DLC Out Now"
                        className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border text-text-primary text-sm outline-none focus:border-accent"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-text-muted mb-1">Body</label>
                      <textarea
                        value={sponsoredContent.body}
                        onChange={e => setSponsoredContent(s => ({ ...s, body: e.target.value }))}
                        rows={3}
                        placeholder="Short promotional copy…"
                        className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border text-text-primary text-sm outline-none focus:border-accent resize-y"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1">CTA URL</label>
                      <input
                        type="url"
                        value={sponsoredContent.ctaUrl}
                        onChange={e => setSponsoredContent(s => ({ ...s, ctaUrl: e.target.value }))}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border text-text-primary text-sm outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1">Image URL (optional)</label>
                      <input
                        type="url"
                        value={sponsoredContent.imageUrl}
                        onChange={e => setSponsoredContent(s => ({ ...s, imageUrl: e.target.value }))}
                        placeholder="https://example.com/banner.jpg"
                        className="w-full px-3 py-2 rounded-lg bg-bg-elevated border border-border text-text-primary text-sm outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCampaignModal(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={isSendingCampaign}
              disabled={!campaignSubject.trim() || !campaignBody.trim()}
              onClick={handleSendCampaign}
              icon={<Send className="w-4 h-4" />}
            >
              Send Campaign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
