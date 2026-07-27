'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAuthStore } from '@/store/authStore';
import type { Role } from '@/types';

/**
 * Bridges NextAuth session state into the Zustand authStore so every
 * component can read isAuthenticated / user / isLoading synchronously
 * without calling useSession() everywhere.
 */
export default function SessionProvider() {
  const { data: session, status } = useSession();
  const { setUser, clearSession } = useAuthStore();

  useEffect(() => {
    // NOTE: Service worker registration is handled by ServiceWorkerRegistration.tsx.
    // Do NOT register it here — doing so causes a duplicate install lifecycle
    // that fires two fetch listeners and doubles network requests on first load.

    // status === 'loading' → keep isLoading: true (initial store state)
    if (status === 'loading') return;

    if (status === 'authenticated' && session?.user) {
      setUser({
        id: (session.user as { id?: string }).id ?? '',
        email: session.user.email ?? '',
        username: (session.user as { username?: string }).username ?? '',
        displayName: (session.user as { displayName?: string }).displayName ?? session.user.name ?? '',
        avatarUrl: session.user.image ?? null,
        bio: null,
        role: ((session.user as { role?: Role }).role ?? 'USER') as Role,
        emailVerified: true,
        twoFactorEnabled: (session.user as any).twoFactorEnabled ?? false,
        oauthProvider: null,
        premiumUntil: null,
        createdAt: '',
        lastLoginAt: null,
      });
    } else {
      // unauthenticated or session error — clear store and mark loading done
      clearSession();
    }
  }, [status, session, setUser, clearSession]);

  return null;
}
