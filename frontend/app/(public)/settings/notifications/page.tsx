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

  return (
    <div className="space-y-8 w-full" style={{ fontFamily: "'Rubik', sans-serif" }}>


      {/* Preferences Section */}
      <section className="bg-bg-surface dark:bg-[#3A3F4A] border border-border rounded-2xl p-6">
        <h3 className="text-[20px] font-bold text-text-primary mb-5">Preferences</h3>
        <div className="space-y-4">
          {isSupported && (
            <div className="flex items-center justify-between p-4 rounded-xl dark:bg-[#3A3F4A] border border-border dark:border-white/20">
              <div>
                <p className="text-[16px] font-medium text-text-primary">Push Notifications</p>
                <p className="text-[14px] text-text-muted mt-0.5">Get notified in your browser</p>
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
          {notifPrefs && ['newArticlesInCategories', 'commentReplies', 'newsletter'].map(key => (
            <div key={key} className="flex items-center justify-between p-4 rounded-xl dark:bg-[#3A3F4A] border border-border dark:border-white/20">
              <p className="text-[16px] font-medium text-text-primary">
                {key === 'newArticlesInCategories' ? 'New Articles'
                  : key === 'commentReplies' ? 'Comment Replies'
                  : 'Newsletter'}
              </p>
              <button onClick={() => {
                const newValue = !notifPrefs[key as keyof typeof notifPrefs];
                // Optimistically update the UI cache immediately
                mutatePrefs({ ...notifPrefs, [key]: newValue }, false);
                // Send the network request in the background
                updateNotificationPreferences({ [key]: newValue }).catch(() => {
                  // Revert if the request fails
                  mutatePrefs();
                });
              }}
                className={`relative w-10 h-6 rounded-full transition-colors ${notifPrefs[key as keyof typeof notifPrefs] ? 'bg-accent' : 'bg-border'}`}>
                <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${notifPrefs[key as keyof typeof notifPrefs] ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Email Communications Section */}
      <section className="bg-bg-surface dark:bg-[#3A3F4A] border border-border rounded-2xl p-6">
        <h3 className="text-[20px] font-bold text-text-primary mb-5">Email Communications</h3>
        <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4 p-4 rounded-xl dark:bg-[#3A3F4A] border border-border dark:border-white/20">
          <div className="flex items-start">
            <div>
              <p className="text-[16px] font-medium text-text-primary">Marketing Newsletter</p>
              <p className="text-[14px] text-text-muted mt-0.5">New game releases, reviews, deals, and site updates sent to {session?.user?.email ?? 'your email'}.</p>
            </div>
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
      </section>

      {/* Inbox Section */}
      <section>
        <h3 className="text-[20px] font-bold text-text-primary mb-5">Inbox</h3>
        {!hasAny ? (
          <div className="text-center py-16 bg-bg-surface dark:bg-[#3A3F4A] border border-border rounded-2xl">
            <p className="text-4xl mb-4">🎮</p>
            <p className="text-[20px] font-semibold text-text-primary">You're all caught up!</p>
            <p className="text-[16px] text-text-muted mt-1">No notifications to show.</p>
          </div>
        ) : (
          GROUP_ORDER.map(group => {
            const items = grouped[group];
            if (!items || items.length === 0) return null;
            return (
              <div key={group} className="mb-6">
                <h4 className="text-[14px] font-bold uppercase tracking-widest text-text-muted mb-3">{group}</h4>
                <div className="rounded-2xl overflow-hidden border border-border">
                  {items.map((n, i) => (
                    <div
                      key={n.id}
                      onClick={() => markOne(n.id, n.url)}
                      className={cn(
                        'w-full text-left flex items-start gap-3 pl-3 pr-5 py-4 transition-colors hover:bg-accent-dim cursor-pointer',
                        !n.isRead ? 'bg-accent/5' : 'dark:bg-[#3A3F4A]',
                        i < items.length - 1 && 'border-b border-border dark:border-white/20'
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
                      {!n.isRead ? (
                        <span className="mt-2 w-2 h-2 rounded-full bg-accent shrink-0" />
                      ) : (
                        <span className="mt-2 w-2 h-2 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[16px] font-semibold text-text-primary">{n.title}</p>
                        <p className="text-[16px] text-text-muted mt-0.5">{n.body}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0 mt-0.5">
                        <span className="text-[14px] text-text-dim">{timeAgo(n.createdAt)}</span>
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
      </section>
    </div>
  );
}
