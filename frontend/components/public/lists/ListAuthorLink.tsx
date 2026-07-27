'use client';

import { useProfileModalStore } from '@/store/profileModalStore';
import { getInitials } from '@/lib/utils';

interface ListAuthorLinkProps {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

/** Reading lists can belong to any user, staff or not — the role isn't known
 *  here, so this always opens the profile modal, which shows an "Articles"
 *  tab in place of "Reviews" once it fetches the profile and sees isStaff. */
export default function ListAuthorLink({ username, displayName, avatarUrl }: ListAuthorLinkProps) {
  const openProfile = useProfileModalStore((s) => s.openProfile);

  return (
    <button type="button" onClick={() => openProfile(username)} className="flex items-center gap-2 group">
      <div className="relative w-8 h-8 shrink-0 rounded-full overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--green))' }}
          >
            {getInitials(displayName)}
          </div>
        )}
      </div>
      <span className="text-sm font-semibold group-hover:text-[#00c98a] transition-colors" style={{ color: '#00e5a0' }}>
        {displayName}
      </span>
    </button>
  );
}
