'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetchNotificationPreferences, updateNotificationPreferences } from '@/lib/api';
import { useNotifStore } from '@/store/notifStore';
import Button from '@/components/ui/Button';
import { Mail, Bell, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InAppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  url: string | null;
  isRead: boolean;
  createdAt: string;
}

type Group = 'Today' | 'Yesterday' | 'This week' | 'Older';

function getGroup(dateStr: string): Group {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays < 1 && now.getDate() === d.getDate()) return 'Today';
  if (diffDays < 2 && now.getDate() - d.getDate() === 1) return 'Yesterday';
  if (diffDays < 7) return 'This week';
  return 'Older';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const day = new Date(dateStr);
  return day.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const GROUP_ORDER: Group[] = ['Today', 'Yesterday', 'This week', 'Older'];

export default function NotificationsSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const { isSupported, isSubscribed, subscribe, unsubscribe, checkSubscription } = useNotifStore();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [unsubLoading, setUnsubLoading] = useState(false);
  const [unsubDone, setUnsubDone] = useState(false);
  const { data: notifPrefs, mutate: mutatePrefs } = useSWR(status === 'authenticated' ? 'notif-prefs' : null, () => fetchNotificationPreferences().then(r => r.data));

  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login?callbackUrl=/settings/notifications');
  }, [status, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/notifications/inbox?limit=100', { credentials: 'include' });
      const json = await res.json();
      setNotifications(json?.data?.notifications ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') load();
  }, [status, load]);

  const markOne = useCallback(async (id: string, url: string | null) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    fetch('/api/user/notifications/inbox', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id }),
    }).catch(() => {});
    if (url) router.push(url);
  }, [router]);

  const deleteOne = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    fetch(`/api/user/notifications/inbox?id=${id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => {});
  }, []);

  if (status === 'loading' || loading) {
    return (
      <div className="w-full px-4 py-4 space-y-8">
        <div className="h-8 w-48 shimmer rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 shimmer rounded-xl" />
        ))}
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  // Group notifications
  const grouped: Partial<Record<Group, InAppNotification[]>> = {};
  for (const n of notifications) {
    const g = getGroup(n.createdAt);
    if (!grouped[g]) grouped[g] = [];
    grouped[g]!.push(n);
  }
  const hasAny = notifications.length > 0;

  // Shared row class
  const rowCls = 'flex items-center gap-4 px-5 py-4 border-b border-border dark:border-white/[0.07] last:border-0 transition-colors';

  return (
    <div className="space-y-10 w-full" style={{ fontFamily: "'Gibson', sans-serif" }}>

      {/* ── Preferences ── */}
      <div>
        <div className="mb-4">
          <h3 className="text-[18px] font-bold text-text-primary">Preferences</h3>
          <p className="text-[13px] text-text-muted mt-0.5">Manage how and where you receive notifications.</p>
        </div>
        <div className="rounded-xl border border-border dark:border-white/[0.08] overflow-hidden">
          {isSupported && (
            <div className={rowCls}>
              <Bell className="w-5 h-5 text-text-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-text-primary">Push Notifications</p>
                <p className="text-[13px] text-text-muted mt-0.5">Get notified in your browser</p>
              </div>
              <Button
                size="sm"
                variant={isSubscribed ? 'outline' : 'auth'}
                loading={isSubscribing}
                onClick={async () => {
                  setIsSubscribing(true);
                  if (isSubscribed) {
                    await unsubscribe();
                  } else {
                    await subscribe();
                  }
                  setIsSubscribing(false);
                }}
              >
                {isSubscribed ? 'Disable' : 'Enable'}
              </Button>
            </div>
          )}
          
          {notifPrefs && ['newArticlesInCategories', 'commentReplies', 'newsletter'].map((key) => {
            const isNewsletter = key === 'newsletter';
            // We handle newsletter separately below in Email Communications
            if (isNewsletter) return null;
            
            return (
              <div key={key} className={rowCls}>
                <div className="w-5 h-5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-text-primary">
                    {key === 'newArticlesInCategories' ? 'New Articles' : 'Comment Replies'}
                  </p>
                  <p className="text-[13px] text-text-muted mt-0.5">
                    {key === 'newArticlesInCategories' 
                      ? 'In-app alerts for new articles in categories you follow.' 
                      : 'In-app alerts when someone replies to your comment.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newValue = !notifPrefs[key as keyof typeof notifPrefs];
                    mutatePrefs({ ...notifPrefs, [key]: newValue }, false);
                    updateNotificationPreferences({ [key]: newValue }).catch(() => mutatePrefs());
                  }}
                  className={`relative w-10 h-6 rounded-full transition-colors ${notifPrefs[key as keyof typeof notifPrefs] ? 'bg-accent' : 'bg-border'}`}
                >
                  <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${notifPrefs[key as keyof typeof notifPrefs] ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Email Communications ── */}
      <div>
        <div className="mb-4">
          <h3 className="text-[18px] font-bold text-text-primary">Email Communications</h3>
          <p className="text-[13px] text-text-muted mt-0.5">Emails sent to {session?.user?.email ?? 'your email'}.</p>
        </div>
        <div className="rounded-xl border border-border dark:border-white/[0.08] overflow-hidden">
          <div className={rowCls}>
            <Mail className="w-5 h-5 text-text-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-medium text-text-primary">Marketing Newsletter</p>
              <p className="text-[13px] text-text-muted mt-0.5">New game releases, reviews, deals, and site updates.</p>
            </div>
            <Button
              size="sm"
              variant={unsubDone ? "auth" : "outline"}
              loading={unsubLoading}
              onClick={async () => {
                const email = session?.user?.email;
                if (!email) return;
                setUnsubLoading(true);
                try {
                  await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/newsletter/${unsubDone ? 'subscribe' : 'unsubscribe'}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email }),
                  });
                  setUnsubDone(!unsubDone);
                } finally {
                  setUnsubLoading(false);
                }
              }}
            >
              {unsubDone ? 'Subscribe' : 'Unsubscribe'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Inbox ── */}
      <div>
        <div className="mb-4">
          <h3 className="text-[18px] font-bold text-text-primary">Inbox</h3>
          <p className="text-[13px] text-text-muted mt-0.5">Your recent in-app notifications.</p>
        </div>
        
        {!hasAny ? (
          <div className="rounded-xl border border-border dark:border-white/[0.08] py-16 text-center">
            <p className="text-4xl mb-4">🎮</p>
            <p className="text-[16px] font-semibold text-text-primary">You're all caught up!</p>
            <p className="text-[14px] text-text-muted mt-1">No notifications to show.</p>
          </div>
        ) : (
          GROUP_ORDER.map(group => {
            const items = grouped[group];
            if (!items || items.length === 0) return null;
            return (
              <div key={group} className="mb-6">
                <h4 className="text-[12px] font-bold uppercase tracking-widest text-text-muted mb-2 px-1">{group}</h4>
                <div className="rounded-xl border border-border dark:border-white/[0.08] overflow-hidden">
                  {items.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markOne(n.id, n.url)}
                      className={cn(
                        rowCls,
                        'cursor-pointer hover:bg-accent-dim',
                        !n.isRead ? 'bg-accent/5 dark:bg-[rgba(29,132,245,0.07)]' : 'dark:bg-white/[0.02]'
                      )}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          markOne(n.id, n.url);
                        }
                      }}
                    >
                      <span className={cn('w-2 h-2 rounded-full shrink-0', !n.isRead ? 'bg-accent' : 'bg-transparent')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold text-text-primary">{n.title}</p>
                        <p className="text-[14px] text-text-muted mt-0.5">{n.body}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[12px] text-text-muted">{timeAgo(n.createdAt)}</span>
                        <button
                          onClick={(e) => deleteOne(e, n.id)}
                          className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                          aria-label="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

