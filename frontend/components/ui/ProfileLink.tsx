'use client';

import Link from 'next/link';
import { useProfileModalStore } from '@/store/profileModalStore';
import { cn } from '@/lib/utils';

interface ProfileLinkProps {
  username: string;
  /** When true (default), navigates to /authors/[username] instead of opening the modal */
  isAuthor?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * For staff authors/editors/admins → navigates to the dedicated /authors/[username] page.
 * For regular users → opens the profile modal as before.
 */
export default function ProfileLink({ username, isAuthor = true, className, style, children }: ProfileLinkProps) {
  const openProfile = useProfileModalStore((s) => s.openProfile);

  if (isAuthor) {
    return (
      <Link href={`/authors/${username}`} className={cn('inline', className)} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => openProfile(username, false)} className={cn('inline', className)} style={style}>
      {children}
    </button>
  );
}
