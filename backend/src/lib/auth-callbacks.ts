import { prisma } from "./prisma";
import type { Role } from "@/generated/prisma";

// Kept in a separate module (no next-auth imports) so the sessionVersion
// invalidation logic can be unit-tested without bootstrapping NextAuth(),
// whose ESM-only build jest cannot transform.
export async function jwtCallback({ token, user, account }: any) {
  // FIX: only fetch from DB on first sign-in (when user object is present),
  // not on every subsequent token refresh
  if (user) {
    let dbUser;
    if (user.email) {
      dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, role: true, username: true, displayName: true, sessionVersion: true },
      });
    } else {
      // Steam or email-less provider — look up by oauthProvider + oauthId
      dbUser = await prisma.user.findFirst({
        where: { oauthProvider: account?.provider, oauthId: account?.providerAccountId },
        select: { id: true, role: true, username: true, displayName: true, sessionVersion: true },
      });
    }
    if (dbUser) {
      token.id = dbUser.id;
      token.role = dbUser.role;
      token.username = dbUser.username;
      token.displayName = dbUser.displayName;
      token.sv = dbUser.sessionVersion;
      token.svCheckedAt = Date.now();
    }
    return token;
  }

  // On subsequent requests, re-check sessionVersion at most every 5 minutes
  // so a "sign out everywhere" takes effect without a DB read on every request.
  const SV_CHECK_INTERVAL_MS = 5 * 60 * 1000;
  if (token.id && Date.now() - (token.svCheckedAt ?? 0) > SV_CHECK_INTERVAL_MS) {
    const dbUser = await prisma.user.findUnique({
      where: { id: token.id },
      select: { sessionVersion: true },
    });
    token.svCheckedAt = Date.now();
    if (!dbUser || dbUser.sessionVersion !== token.sv) {
      token.invalid = true;
    }
  }
  return token;
}

export async function sessionCallback({ session, token }: any) {
  if (token?.invalid) {
    return null as unknown as typeof session;
  }
  if (token) {
    session.user.id = token.id as string;
    session.user.role = token.role as Role;
    session.user.username = token.username as string;
    session.user.displayName = token.displayName as string;
  }
  return session;
}
