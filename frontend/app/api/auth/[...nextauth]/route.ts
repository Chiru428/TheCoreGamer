/**
 * Frontend NextAuth handler.
 *
 * Serves all /api/auth/* endpoints (session, csrf, callback, signout, etc.)
 * locally on the frontend so NextAuth's SessionProvider always receives
 * valid JSON — never a proxied plain-text error from the backend.
 *
 * OAuth flows (Google, Discord) are handled here because the callback URL
 * must match the public-facing frontend domain.
 *
 * Credentials sign-in delegates to the backend API via the `authorize()`
 * callback in lib/next-auth.ts — no database access is needed here.
 */
import { handlers } from '@/lib/next-auth';

export const { GET, POST } = handlers;

// Run in Node.js runtime — needed for crypto / fetch used by NextAuth JWT
export const runtime = 'nodejs';
