import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "./prisma";

// Custom Steam OpenID 2.0 provider has been removed and replaced with a dedicated API route
// at app/api/auth/steam/route.ts in the frontend to bypass NextAuth v5's strict OAuth constraints.

const providers: any[] = [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }),
  Discord({
    clientId: process.env.DISCORD_CLIENT_ID!,
    clientSecret: process.env.DISCORD_CLIENT_SECRET!,
  }),
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      totpCode: { label: "2FA Code", type: "text" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Email and password are required");
      }

      const user = await prisma.user.findUnique({
        where: { email: credentials.email as string },
      });

      if (!user || !user.passwordHash) {
        throw new Error("Invalid credentials");
      }

      // FIX: enforce email verification before allowing login
      if (!user.emailVerified) {
        throw new Error("EMAIL_NOT_VERIFIED");
      }

      // Check account lockout
      if (user.lockUntil && user.lockUntil > new Date()) {
        throw new Error("Account is locked. Please try again later.");
      }

      const isValid = await bcrypt.compare(credentials.password as string, user.passwordHash);

      if (!isValid) {
        const attempts = user.loginAttempts + 1;
        const lockUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;

        await prisma.user.update({
          where: { id: user.id },
          data: { loginAttempts: attempts, lockUntil },
        });

        throw new Error("Invalid credentials");
      }

      // Check 2FA if enabled
      if (user.twoFactorEnabled) {
        if (!credentials.totpCode) {
          throw new Error("2FA_REQUIRED");
        }

        const { verifyTOTP } = await import("@/lib/totp");
        const isValidTotp = verifyTOTP(user.twoFactorSecret!, credentials.totpCode as string);

        if (!isValidTotp) {
          throw new Error("Invalid 2FA code");
        }
      }

      // Reset login attempts on success
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: 0,
          lockUntil: null,
          lastLoginAt: new Date(),
        },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.displayName,
        image: user.avatarUrl,
      };
    },
  }),
];

// Steam is handled manually via /api/auth/steam/route.ts in the frontend

import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { getToken } from "next-auth/jwt";
import { jwtCallback, sessionCallback } from "./auth-callbacks";

const {
  handlers,
  signIn,
  signOut,
  auth: originalAuth,
} = NextAuth({
  trustHost: true,
  // NextAuth v5 reads AUTH_SECRET first, NEXTAUTH_SECRET second
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  // NOTE ON THIS FILE'S SCOPE: this NextAuth instance's *session-verification*
  // side (the `auth()` export below) is genuinely used — requireRole()/
  // requireAuth() call it as a fallback on every protected backend route.
  // But its sign-in providers/callbacks below are NOT what real users go
  // through: the actual login flow is frontend/lib/next-auth.ts, whose
  // Credentials provider calls POST /api/auth/login and whose OAuth flow
  // calls POST /api/auth/oauth-sync — neither touches this file's providers
  // or signIn callback. This backend NextAuth instance's own sign-in
  // handlers (mounted at /api/auth/[...nextauth]) are still technically
  // reachable, just not the path production traffic takes.
  //
  // No `adapter` here on purpose: this previously used PrismaAdapter(prisma),
  // but the schema has no Account/Session/VerificationToken models (this app
  // manages users directly via the signIn callback below and via
  // /api/auth/login + /api/auth/oauth-sync). session.strategy is "jwt", which
  // doesn't require a DB adapter at all — frontend/lib/next-auth.ts already
  // runs this exact way. Keeping the adapter pointed at non-existent tables
  // meant this file's OAuth handlers would very likely have thrown if they
  // were ever actually hit (stray link, misconfigured OAuth redirect URI,
  // manual testing) — removing it fixes that latent crash without changing
  // any currently-working behavior.
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "credentials") {
        // Steam and other providers may not supply an email — match by provider+id first
        let existingUser;
        if (!user.email) {
          existingUser = await prisma.user.findFirst({
            where: { oauthProvider: account?.provider, oauthId: account?.providerAccountId },
          });
        } else {
          existingUser = await prisma.user.findUnique({ where: { email: user.email } });
        }

        if (!existingUser) {
          const username = user.email
            ? user.email.split("@")[0] + "_" + Date.now()
            : `${account?.provider ?? "oauth"}${Date.now()}`;

          await prisma.user.create({
            data: {
              email: user.email ?? null,
              username,
              displayName: user.name || "User",
              avatarUrl: user.image,
              oauthProvider: account?.provider,
              oauthId: account?.providerAccountId,
              emailVerified: true,
              role: "USER",
            },
          });
        } else {
          // FIX: only update oauth fields if the account was already an OAuth account
          // or if no oauth provider is set yet — never overwrite a credentials-only account silently.
          if (existingUser.oauthProvider || !existingUser.passwordHash) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                oauthProvider: account?.provider,
                oauthId: account?.providerAccountId,
                lastLoginAt: new Date(),
              },
            });
          } else {
            // Credential account with same email — block OAuth sign-in to prevent takeover
            return false;
          }
        }
      }
      return true;
    },
    jwt: jwtCallback,
    session: sessionCallback,
  },
});

export const auth = async (...args: any[]) => {
  if (args.length === 0) {
    try {
      const reqHeaders = await headers();
      // Reconstruct a NextRequest so getToken can parse the cookies securely
      const req = new NextRequest(process.env.NEXTAUTH_URL || "http://localhost:3001", {
        headers: reqHeaders,
      });

      const cookieHeader = reqHeaders.get("cookie") || "";
      let cookieName = "authjs.session-token";
      if (cookieHeader.includes("__Secure-authjs.session-token")) {
        cookieName = "__Secure-authjs.session-token";
      } else if (cookieHeader.includes("__Secure-next-auth.session-token")) {
        cookieName = "__Secure-next-auth.session-token";
      } else if (cookieHeader.includes("next-auth.session-token")) {
        cookieName = "next-auth.session-token";
      }

      const token = await getToken({
        req,
        secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
        secureCookie: process.env.NODE_ENV === "production",
        cookieName,
      });
      if (token) return { user: token } as any;
    } catch (e) {
      // Fallback if headers() fails
    }
  }
  return (originalAuth as any)(...args);
};

export { handlers, signIn, signOut };
