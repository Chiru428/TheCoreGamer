'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetchAdminStats, fetchAnalytics, fetchWorkerHealth } from '@/lib/api';
import { 
  FileText, Eye, Users, Megaphone, TrendingUp, Clock, Star, 
  Wrench, BookOpen, AlertTriangle, MessageSquare, Plus, CheckCircle2,
  Activity, ShoppingCart, Award, PieChart
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { Spinner } from '@/components/ui/Spinner';
import { AdminDashboardSkeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';
import Image from 'next/image';
import { contentTypePath } from '@/lib/seo';

const WORKER_LABELS: Record<string, string> = {
  articleCron: 'Article Cron',
  email: 'Email',
  newsletter: 'Newsletter',
  searchIndex: 'Search Index',
  push: 'Push',
  deals: 'Deals',
  toxicity: 'Toxicity',
  igdbSync: 'IGDB Sync',
  algolia: 'Algolia',
};

const STATUS_DOT_COLOR: Record<string, string> = {
  healthy: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
  degraded: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
  critical: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
};

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

// Premium Area Chart for Page Views
const AreaChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return null;
  const maxViews = Math.max(...data.map((d: any) => d.views), 10);
  const width = 1000;
  const height = 200;
  const padding = 10;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - (d.views / maxViews) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const areaPath = `M ${padding},${height - padding} L ${points} L ${width - padding},${height - padding} Z`;

  return (
    <div className="relative w-full h-[180px] mt-4">
      {/* Dashed background grid lines */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
        <div className="border-b border-dashed border-border w-full flex-1"></div>
        <div className="border-b border-dashed border-border w-full flex-1"></div>
        <div className="w-full flex-1"></div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.6}/>
            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#colorViews)" className="transition-all duration-1000 ease-out" />
        <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)] transition-all duration-1000 ease-out" />
      </svg>
      {/* Tooltip Overlay (simplified dots) */}
      <div className="absolute inset-0 flex justify-between items-end opacity-0 hover:opacity-100 transition-opacity">
        {data.map((pv, i) => {
          const heightPct = (pv.views / maxViews) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end items-center h-full group relative cursor-pointer">
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-bg-elevated/90 backdrop-blur border border-white/10 px-3 py-1.5 rounded-lg shadow-xl text-xs text-text-primary opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 whitespace-nowrap z-10 pointer-events-none">
                <div className="font-bold text-accent">{pv.views.toLocaleString()} views</div>
                <div className="text-[10px] text-text-muted text-center">{pv.date}</div>
              </div>
              <div className="w-full h-full" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

function ExpandableComment({ comment }: { comment: any }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = comment.body && comment.body.length > 120;

  return (
    <div className="p-3.5 rounded-xl bg-bg-elevated/20 border border-white/5 hover:border-white/10 transition-colors flex flex-col">
       <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-text-muted mb-2">
        <span className="font-bold text-text-primary">{comment.authorName}</span>
        <span>on</span>
        <span className="italic text-text-primary">{comment.articleTitle}</span>
        <span className="ml-auto min-w-max">{formatRelativeTime(comment.createdAt)}</span>
      </div>
      <div className={`text-sm text-text-secondary leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}>
        {comment.body}
      </div>
      {isLong && (
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="mt-2 text-xs font-semibold text-accent hover:text-accent-light transition-colors self-start"
        >
          {expanded ? 'Show Less' : 'Read More'}
        </button>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const isEditorOrAdmin = user?.role === 'EDITOR' || user?.role === 'ADMIN';

  useEffect(() => {
    setMounted(true);
    if (user && !isEditorOrAdmin) {
      router.replace('/admin/posts');
    }
  }, [user, isEditorOrAdmin, router]);

  const { data: stats, isLoading: statsLoading } = useSWR(isEditorOrAdmin ? 'admin-stats' : null, () => fetchAdminStats().then(r => r.data));
  const { data: analytics, isLoading: analyticsLoading } = useSWR(isEditorOrAdmin ? 'admin-analytics' : null, () => fetchAnalytics().then(r => r.data));
  const { data: workerHealth } = useSWR(isEditorOrAdmin ? 'admin-worker-health' : null, () => fetchWorkerHealth().then(r => r.data), { refreshInterval: 60000 });

  if (!isEditorOrAdmin || !mounted) {
    return (
      <div className="w-full">
        <AdminDashboardSkeleton />
      </div>
    );
  }

  // Animation delay helper
  const stagger = (index: number) => ({
    animationDelay: `${index * 100}ms`,
    opacity: 0,
    animation: 'fadeSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards'
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .glass-card {
          background: rgba(var(--bg-surface-rgb), 0.5);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 4px 24px -1px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }
        .glass-card:hover {
          background: rgba(var(--bg-surface-rgb), 0.7);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
          box-shadow: 0 12px 32px -4px rgba(0, 0, 0, 0.3);
        }
        .text-gradient {
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-image: linear-gradient(135deg, var(--text) 0%, var(--muted) 100%);
        }
      `}} />

      {workerHealth?.status === 'critical' && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse">
          <AlertTriangle className="w-6 h-6 flex-shrink-0 text-red-500" />
          <span className="font-medium">Critical system alert: One or more background workers are failing. Check the health panel.</span>
        </div>
      )}

      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4" style={stagger(0)}>
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">Dashboard</h1>
          <p className="text-text-muted mt-1">Welcome back, {user?.displayName?.split(' ')[0] || 'Editor'}. Here is what's happening.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/posts/new" className="flex items-center gap-2 bg-accent hover:bg-accent-light text-white px-5 py-2.5 rounded-xl font-medium transition-all hover:shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]">
            <Plus className="w-5 h-5" />
            New Post
          </Link>
          <Link href="/admin/posts?status=IN_REVIEW" className="flex items-center gap-2 bg-bg-surface hover:bg-bg-elevated border border-border px-5 py-2.5 rounded-xl font-medium transition-all text-text-primary">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Review Queue
          </Link>
        </div>
      </div>

      {/* Primary Metrics Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Published Articles', value: stats?.totalPublished, icon: FileText, color: 'text-blue-400', glow: 'shadow-[0_0_15px_rgba(96,165,250,0.3)]' },
          { label: 'Pending Review', value: stats?.pendingReview, icon: Clock, color: 'text-amber-400', glow: 'shadow-[0_0_15px_rgba(251,191,36,0.3)]' },
          { label: 'Total Users', value: stats?.totalUsers, icon: Users, color: 'text-emerald-400', glow: 'shadow-[0_0_15px_rgba(52,211,153,0.3)]' },
          { label: 'Active Ad Zones', value: stats?.activeAdZones, icon: Megaphone, color: 'text-purple-400', glow: 'shadow-[0_0_15px_rgba(192,132,252,0.3)]' },
        ].map((card, i) => (
          <div key={card.label} className="glass-card rounded-2xl p-6 relative overflow-hidden group" style={stagger(1 + i * 0.5)}>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="text-sm font-medium text-text-muted uppercase tracking-wider">{card.label}</span>
              <div className={`p-2.5 rounded-xl bg-bg-elevated/50 backdrop-blur border border-white/5 ${card.glow} group-hover:scale-110 transition-transform`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            {statsLoading ? (
              <div className="h-10 w-24 bg-white/5 animate-pulse rounded-lg" />
            ) : (
              <p className="text-4xl font-black text-gradient">{formatNumber(card.value ?? 0)}</p>
            )}
            {/* Subtle background glow effect */}
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 opacity-10 blur-3xl rounded-full bg-current ${card.color} pointer-events-none`} />
          </div>
        ))}
      </div>

      {/* Main Charts & Analytics Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Page Views Area Chart */}
        <div className="glass-card rounded-2xl p-6 lg:col-span-2 flex flex-col" style={stagger(3)}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Traffic Overview</h2>
              <p className="text-sm text-text-muted">Page views over the last 30 days</p>
            </div>
            <div className="flex gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-text-muted uppercase font-medium">Unique Visitors</div>
                <div className="text-lg font-bold text-accent">{analyticsLoading ? '...' : formatNumber(analytics?.uniqueVisitors ?? 0)}</div>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-xs text-text-muted uppercase font-medium">Avg Session</div>
                <div className="text-lg font-bold text-text-primary">{analyticsLoading ? '...' : `${Math.floor((analytics?.sessionDuration || 0) / 60)}m`}</div>
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-end min-h-[200px]">
             {analyticsLoading ? (
               <div className="w-full h-full flex items-center justify-center"><Spinner className="w-10 h-10 text-accent/50" /></div>
             ) : (
               <AreaChart data={analytics?.pageViews ?? []} />
             )}
          </div>
        </div>

        {/* Top Authors Leaderboard */}
        <div className="glass-card rounded-2xl p-6 flex flex-col" style={stagger(3.5)}>
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-text-primary">Top Contributors</h2>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar min-h-[200px]">
            {statsLoading ? (
               <div className="w-full h-full flex items-center justify-center"><Spinner className="w-8 h-8 text-accent/50" /></div>
            ) : stats?.topAuthors?.length ? (
              stats.topAuthors.map((author: any, i: number) => (
                <div key={author.id} className="flex items-center justify-between p-3 rounded-xl bg-bg-elevated/30 border border-white/5 hover:bg-bg-elevated transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {author.avatarUrl ? (
                        <Image src={author.avatarUrl} alt={author.displayName} width={36} height={36} className="rounded-full ring-2 ring-accent/20" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold ring-2 ring-accent/20">
                          {author.displayName?.charAt(0) || '?'}
                        </div>
                      )}
                      {i === 0 && <span className="absolute -top-1 -right-1 text-lg leading-none">👑</span>}
                    </div>
                    <div>
                      <div className="font-semibold text-text-primary text-sm line-clamp-1">{author.displayName}</div>
                      <div className="text-xs text-text-muted">Author</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-accent">{author.articleCount}</div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider">Posts</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-text-muted text-sm py-10">No authors found</div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pipeline & Recent Activity */}
        <div className="glass-card rounded-2xl p-6 lg:col-span-2" style={stagger(4)}>
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-text-primary">Recent Activity</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Articles */}
            <div>
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Latest Posts
              </h3>
              <div className="space-y-3">
                {stats?.recentActivity?.articles?.map((article: any) => (
                  <Link key={article.id} href={`/${contentTypePath(article.type)}/${article.slug}`} target="_blank" className="block p-3.5 rounded-xl bg-bg-elevated/20 border border-white/5 hover:border-white/10 hover:bg-bg-elevated/30 transition-colors group">
                    <div className="text-sm font-medium text-text-primary mb-2 group-hover:underline decoration-white/30 underline-offset-2 transition-all leading-snug">{article.title}</div>
                    <div className="flex items-center justify-between text-xs text-text-muted">
                      <span className="flex items-center gap-1.5">
                         <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                         {article.authorName}
                      </span>
                      <span>{article.publishedAt ? formatRelativeTime(article.publishedAt) : 'Draft'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            
            {/* Comments */}
            <div>
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" /> Latest Comments
              </h3>
              <div className="space-y-3">
                {stats?.recentActivity?.comments?.map((comment: any) => (
                  <ExpandableComment key={comment.id} comment={comment} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Affiliate, Content & Worker Status Stack */}
        <div className="space-y-6 flex flex-col" style={stagger(4.5)}>
          
          {/* Content Breakdown */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-text-primary">Content Distribution</h2>
            </div>
            
            {!statsLoading && stats?.articles?.byType ? (
              <div className="space-y-4">
                <div className="flex w-full h-2 rounded-full overflow-hidden">
                  {[
                    { key: 'news', color: 'bg-blue-400' },
                    { key: 'review', color: 'bg-emerald-400' },
                    { key: 'modGuide', color: 'bg-amber-400' },
                    { key: 'walkthrough', color: 'bg-purple-400' },
                    { key: 'deal', color: 'bg-rose-400' },
                    { key: 'opinion', color: 'bg-teal-400' },
                    { key: 'feature', color: 'bg-indigo-400' },
                    { key: 'listicle', color: 'bg-pink-400' }
                  ].map(ct => {
                     const count = stats?.articles?.byType?.[ct.key as 'news' | 'review' | 'modGuide' | 'walkthrough' | 'deal' | 'opinion' | 'feature' | 'listicle'] || 0;
                     if (count === 0) return null;
                     const percent = Math.max(2, (count / Math.max(1, stats?.articles?.published || 1)) * 100);
                     return <div key={ct.key} className={`h-full ${ct.color}`} style={{ width: `${percent}%` }} title={`${count}`} />
                  })}
                </div>
                
                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                  {[
                    { key: 'news', label: 'News', color: 'bg-blue-400' },
                    { key: 'review', label: 'Reviews', color: 'bg-emerald-400' },
                    { key: 'modGuide', label: 'Mod Guides', color: 'bg-amber-400' },
                    { key: 'walkthrough', label: 'Walkthroughs', color: 'bg-purple-400' },
                    { key: 'deal', label: 'Deals', color: 'bg-rose-400' },
                    { key: 'opinion', label: 'Opinions', color: 'bg-teal-400' },
                    { key: 'feature', label: 'Features', color: 'bg-indigo-400' },
                    { key: 'listicle', label: 'Listicles', color: 'bg-pink-400' }
                  ].map(ct => {
                    const count = stats?.articles?.byType?.[ct.key as 'news' | 'review' | 'modGuide' | 'walkthrough' | 'deal' | 'opinion' | 'feature' | 'listicle'] || 0;
                    if (count === 0) return null;
                    return (
                      <div key={ct.key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                           <div className={`w-1.5 h-1.5 rounded-full ${ct.color}`} />
                           {ct.label}
                        </div>
                        <div className="text-xs font-bold text-text-primary">{count}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="h-16 w-full bg-white/5 animate-pulse rounded-lg" />
            )}
          </div>

          {/* Top Deals */}
          <div className="glass-card rounded-2xl p-6 flex-1">
            <div className="flex items-center gap-2 mb-6">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-text-primary">Top Affiliate Stores</h2>
            </div>
            <div className="space-y-3">
               {stats?.topDeals?.length ? stats.topDeals.map((deal: any, i: number) => (
                 <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-bg-elevated/20 border border-white/5">
                   <div className="text-sm font-medium text-text-primary capitalize flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      {deal.store}
                   </div>
                   <div className="text-sm font-bold text-emerald-400">{deal.clickCount} <span className="font-normal text-text-muted text-xs">clicks</span></div>
                 </div>
               )) : (
                 <div className="text-sm text-text-muted py-4 text-center bg-bg-elevated/10 rounded-xl border border-border/50">No affiliate data yet</div>
               )}
            </div>
          </div>

          {/* Worker Health */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="w-5 h-5 text-text-muted" />
              <h2 className="text-base font-bold text-text-primary">System Health</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {!workerHealth ? (
                 <div className="col-span-2 text-sm text-text-muted py-4 text-center bg-bg-elevated/10 rounded-xl border border-border/50 flex flex-col items-center gap-2">
                   <Spinner className="w-5 h-5 text-accent/50" />
                   Checking system status...
                 </div>
              ) : Object.entries(workerHealth.queues).slice(0, 4).map(([name, counts]) => {
                const dotColor = counts.failed > 50 || counts.waiting > 1000
                  ? STATUS_DOT_COLOR.critical
                  : counts.failed > 10
                    ? STATUS_DOT_COLOR.degraded
                    : STATUS_DOT_COLOR.healthy;
                return (
                  <div key={name} className="flex items-center gap-2 rounded-lg bg-bg-elevated/30 px-2.5 py-2 border border-white/5">
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <span className="text-xs font-medium text-text-secondary truncate">{WORKER_LABELS[name] ?? name}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
