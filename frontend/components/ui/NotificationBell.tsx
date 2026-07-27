'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import Link from 'next/link';
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

interface InboxData {
  notifications: InAppNotification[];
  unreadCount: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' })
    .then(r => r.json())
    .then(d => d.data as InboxData);

export default function NotificationBell({ color = 'var(--nav-link)' }: { color?: string } = {}) {
  const { data: session, status } = useSession();

  const { data, error } = useSWR<InboxData>(
    status === 'authenticated' ? '/api/user/notifications/inbox' : null,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );

  const unread = data?.unreadCount ?? 0;

  if (status !== 'authenticated' || !session) return null;
  if (error) return null;

  return (
    <div className="relative">
      <Link
        href="/settings/notifications"
        className="relative block p-2 rounded-xl transition-all duration-300 hover:bg-accent-dim border border-transparent hover:border-accent/20 active:scale-95"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" style={{ color }} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Link>
    </div>
  );
}
