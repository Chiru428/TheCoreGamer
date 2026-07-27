'use client';

import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useSWR from 'swr';
import { AnimatePresence, motion } from 'framer-motion';
import { fetchUserSummary } from '@/lib/api';
import { cn, formatNumber, getInitials } from '@/lib/utils';
import { useProfileModalStore } from '@/store/profileModalStore';
import type { UserProfileSummary } from '@/types';

const OPEN_DELAY = 400;
const CLOSE_DELAY = 150;
const CARD_WIDTH = 240;

interface UserHoverCardProps {
  username: string;
  children: React.ReactNode;
  className?: string;
}

function HoverCardBody({ profile }: { profile: UserProfileSummary }) {
  return (
    <>
      {profile.avatarUrl ? (
        <img src={profile.avatarUrl} alt={profile.username} className="w-16 h-16 rounded-full object-cover" />
      ) : (
        <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg bg-accent text-white dark:text-black">
          {getInitials(profile.displayName || profile.username)}
        </div>
      )}
      <span className="font-bold text-text-primary hover:underline">{profile.displayName}</span>
      <span className="text-text-dim text-sm">@{profile.username}</span>
      <div className="flex items-center gap-6 mt-2">
        <div className="flex flex-col items-center">
          <span className="font-bold text-text-primary">{formatNumber(profile.likesCount)}</span>
          <span className="text-text-dim text-xs">Likes</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-bold text-text-primary">{formatNumber(profile.commentsCount)}</span>
          <span className="text-text-dim text-xs">Comments</span>
        </div>
      </div>
    </>
  );
}

export default function UserHoverCard({ username, children, className }: UserHoverCardProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openProfile = useProfileModalStore((s) => s.openProfile);

  const { data } = useSWR(open ? `user-summary:${username}` : null, () => fetchUserSummary(username));
  const profile = data?.data;

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const handleEnter = useCallback(() => {
    clearTimers();
    openTimer.current = setTimeout(() => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        setCoords({
          top: rect.bottom + 8,
          left: Math.min(rect.left, window.innerWidth - CARD_WIDTH - 8),
        });
      }
      setOpen(true);
    }, OPEN_DELAY);
  }, []);

  const handleLeave = useCallback(() => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  }, []);

  return (
    <span
      ref={triggerRef}
      className={cn('inline-block', className)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                onMouseEnter={clearTimers}
                onMouseLeave={handleLeave}
                style={{ position: 'fixed', top: coords.top, left: coords.left, width: CARD_WIDTH }}
                className="z-50 rounded-xl border border-border bg-bg-surface p-4 shadow-2xl"
              >
                {!profile ? (
                  <div className="flex items-center justify-center py-7">
                    <div className="w-5 h-5 rounded-full border-2 border-border border-t-accent animate-spin" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (profile.profileVisibility === 'PRIVATE' && !profile.isStaff) return;
                      setOpen(false);
                      openProfile(profile.username);
                    }}
                    className="flex flex-col items-center gap-1 text-center w-full"
                  >
                    <HoverCardBody profile={profile} />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </span>
  );
}
