import { Role } from '@/types';
import { cookies } from 'next/headers';

/**
 * Get session on the server side.
 * Forwards the incoming request cookies to the backend so the session
 * endpoint can authenticate the request during SSR. Without forwarding
 * cookies the backend always receives an unauthenticated request and
 * returns null — even for logged-in users.
 */
export async function getServerSession() {
  try {
    const baseUrl = typeof window === 'undefined'
      ? (process.env.BACKEND_URL || 'http://localhost:3001')
      : '';

    // Forward cookies so the backend can verify the session token
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const res = await fetch(`${baseUrl}/api/auth/session`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });
    if (!res.ok) return null;
    const session = await res.json();
    if (!session?.user) return null;
    return session as {
      user: { id: string; email: string; name: string; role: Role; username: string; image?: string };
    };
  } catch {
    return null;
  }
}

/** Check if user has required role */
export function hasRole(userRole: Role | undefined, requiredRoles: Role[]): boolean {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}

/** Check if user is admin or editor */
export function isAdminOrEditor(role: Role | undefined): boolean {
  return hasRole(role, [Role.ADMIN, Role.EDITOR]);
}
