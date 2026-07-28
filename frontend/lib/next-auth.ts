import NextAuth, { AuthError } from 'next-auth';
import { headers } from 'next/headers';
import { getToken } from 'next-auth/jwt';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import Discord from 'next-auth/providers/discord';
import type { Role } from '@/types';

class CustomAuthError extends AuthError {
  constructor(message?: string) {
    super();
    this.type = message || 'CredentialsSignin';
  }
}

/**
 * Frontend NextAuth v5 configuration — JWT-only, no database adapter.
 *
 * SECRET RESOLUTION ORDER (NextAuth v5 / Auth.js):
 *   1. AUTH_SECRET  (preferred in v5)
 *   2. NEXTAUTH_SECRET  (v4 compat)
 *   3. DEV_FALLBACK  (development only — printed as a warning, never used in prod)
 *
 * ⚠️  IMPORTANT: Copy frontend/.env.example → frontend/.env.local and set AUTH_SECRET
 *     to the same value as the backend's AUTH_SECRET before running either app.
 *
 * OAUTH: Google, Discord, and Steam are only active when their env vars are populated.
 * Credentials: delegates password validation to the backend POST /api/auth/login.
 */

const secret =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV === 'development'
    ? (() => {
        console.warn(
          '\n⚠️  [TheCoreGamer] AUTH_SECRET is not set in frontend/.env.local.\n' +
          '   Using an insecure development fallback — sessions will not persist across restarts.\n' +
          '   Copy frontend/.env.example to frontend/.env.local and set AUTH_SECRET.\n'
        );
        return 'dev-fallback-secret-do-not-use-in-production-32chars!!';
      })()
    : undefined);

// Custom Steam OpenID 2.0 provider has been removed and replaced with a dedicated API route
// at app/api/auth/steam/route.ts to bypass NextAuth v5's strict OAuth constraints.

// Build providers array — only include OAuth providers when credentials are configured
const providers: any[] = [
  Credentials({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
      totpCode: { label: '2FA Code', type: 'text' },
      recoveryCode: { label: 'Recovery Code', type: 'text' },
    },
    async authorize(credentials, request) {
      if (!credentials?.email || !credentials?.password) return null;

      try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
        // Forward the real browser's IP/UA so the backend's device-tracking
        // (Devices & Sign-ins, new-device alerts) sees the actual client,
        // not this internal server-to-server request.
        const loginHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        const userAgent = request?.headers.get('user-agent');
        const xRealIp = request?.headers.get('x-real-ip');
        const xForwardedFor = request?.headers.get('x-forwarded-for');
        if (userAgent) loginHeaders['user-agent'] = userAgent;
        if (xRealIp) loginHeaders['x-real-ip'] = xRealIp;
        if (xForwardedFor) loginHeaders['x-forwarded-for'] = xForwardedFor;

        const res = await fetch(`${backendUrl}/api/auth/login`, {
          method: 'POST',
          headers: loginHeaders,
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
            totpCode: credentials.totpCode || undefined,
            recoveryCode: credentials.recoveryCode || undefined,
          }),
        });

        // Backend couldn't be reached at all
        if (!res.ok) {
          let errMsg = 'Invalid credentials';
          try {
            const errBody = await res.json();
            errMsg = errBody?.error || errBody?.message || errMsg;
          } catch { /* body wasn't JSON */ }
          throw new CustomAuthError(errMsg);
        }

        const json = await res.json();

        // 2FA required — signal back to the login page
        if (json.error === '2FA_REQUIRED') {
          throw new CustomAuthError('2FA_REQUIRED');
        }

        const user = json.data;
        if (!user?.id) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          displayName: user.displayName,
          image: user.avatarUrl ?? null,
          // Custom fields carried forward into JWT
          role: user.role as Role,
          username: user.username as string,
        };
      } catch (err) {
        // Re-throw Error instances so NextAuth can surface the message
        if (err instanceof Error) throw err;
        return null;
      }
    },
  }),
];

// Only add OAuth providers when their credentials are present
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }) as never
  );
}

if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  providers.push(
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }) as never
  );
}

// Steam is handled manually via /api/auth/steam/route.ts

console.log("[NextAuth] Loaded providers:", providers.map(p => typeof p === 'function' ? p().id : p.id));

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret,
  trustHost: true,
  logger: {
    error(error) {
      console.error("NEXTAUTH_ERROR", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    },
    warn(code) {
      console.warn("NEXTAUTH_WARN", code);
    },
    debug(code) {
      console.log("NEXTAUTH_DEBUG", code);
    }
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  providers,
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      try {
        if (trigger === 'update' && session) {
          if (session.avatarUrl !== undefined) token.picture = session.avatarUrl;
          if (session.displayName !== undefined) token.displayName = session.displayName;
          if (session.username !== undefined) token.username = session.username;
          return token;
        }

        if (account && account.provider !== 'credentials') {
          // If the browser already had a session before this OAuth round trip
          // started, this is a "connect provider" action from an already
          // signed-in user (Settings > Security), not a fresh sign-in/sign-up.
          // The pre-existing session cookie is still on this request — NextAuth
          // hasn't issued the new one yet — so decode it now to recover who's
          // linking, before it's overwritten below.
          let existingToken: Awaited<ReturnType<typeof getToken>> = null;
          try {
            const incomingHeaders = await headers();
            existingToken = await getToken({
              req: { headers: incomingHeaders },
              secret,
              secureCookie: (process.env.NEXTAUTH_URL || '').startsWith('https://'),
            });
          } catch { /* no pre-existing session, or headers() unavailable */ }
          const linkingUserId = (existingToken?.id as string | undefined) || null;

          try {
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
            // Forward the real browser's IP/UA (read via next/headers since the
            // jwt callback doesn't receive the original Request) so the backend's
            // device-tracking sees the actual client, not this internal call.
            const syncHeaders: Record<string, string> = {
              'Content-Type': 'application/json',
              'x-internal-secret': process.env.INTERNAL_API_SECRET || ""
            };
            try {
              const incomingHeaders = await headers();
              const userAgent = incomingHeaders.get('user-agent');
              const xRealIp = incomingHeaders.get('x-real-ip');
              const xForwardedFor = incomingHeaders.get('x-forwarded-for');
              if (userAgent) syncHeaders['user-agent'] = userAgent;
              if (xRealIp) syncHeaders['x-real-ip'] = xRealIp;
              if (xForwardedFor) syncHeaders['x-forwarded-for'] = xForwardedFor;
            } catch { /* headers() unavailable outside request scope */ }

            const res = await fetch(`${backendUrl}/api/auth/oauth-sync`, {
              method: 'POST',
              headers: syncHeaders,
              body: JSON.stringify({
                email: user?.email || null, // null for Steam
                name: user?.name,
                image: user?.image,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                currentUserId: linkingUserId,
              }),
            });
            const json = await res.json();
            if (res.ok && json.success) {
              token.id = json.data.id;
              token.role = json.data.role;
              token.username = json.data.username;
              token.displayName = json.data.displayName;
            } else {
              console.error("OAuth sync failed:", json.error);
              if (linkingUserId && existingToken) {
                // A failed "connect provider" attempt from Settings → Security must not
                // log the user out of their existing session — restore it as-is.
                token.id = existingToken.id;
                token.role = existingToken.role;
                token.username = existingToken.username;
                token.displayName = existingToken.displayName;
              } else {
                // Fresh sign-in that couldn't be synced — throw so NextAuth surfaces
                // the error on /auth/error rather than issuing a broken session.
                throw new Error(json.error || "OAuth account sync failed");
              }
            }
          } catch (err) {
            console.error("OAuth sync request failed:", err);
            if (linkingUserId && existingToken) {
              token.id = existingToken.id;
              token.role = existingToken.role;
              token.username = existingToken.username;
              token.displayName = existingToken.displayName;
            } else {
              // Re-throw so the outer catch can abort the login
              throw err;
            }
          }
        } else if (user) {
          // Credentials login already has these fields from authorize()
          token.id = user.id;
          token.role = (user as { role?: string }).role ?? 'USER';
          token.username = (user as { username?: string }).username ?? '';
          token.displayName = (user as { displayName?: string }).displayName ?? '';
          token.picture = (user as { image?: string | null }).image ?? null;
        }
        return token;
      } catch (err) {
        console.error("JWT Callback Error:", err);
        // If this is an update trigger, we can safely return the existing token
        if (trigger === 'update') return token;
        // Otherwise, abort the login process by throwing the error.
        // Returning `token` here would issue a broken session to the browser!
        throw err;
      }
    },
    async session({ session, token }) {
      try {
        if (token && session) {
          if (!session.user) {
            session.user = { id: '', email: '' } as any;
          }
          session.user.id = (token.id as string) || '';
          (session.user as { role?: string }).role = (token.role as string) || 'USER';
          (session.user as { username?: string }).username = (token.username as string) || '';
          (session.user as any).displayName = token.displayName || '';
          session.user.image = (token.picture as string | null | undefined) ?? null;
        }
        return session;
      } catch (err) {
        console.error("Session Callback Error:", err);
        return session;
      }
    },
  },
});
