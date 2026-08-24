import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getClientIp } from "@/middleware/rateLimit";
import type { Role } from "@/generated/prisma";

/**
 * Checks whether the requester's IP is in the admin allowlist.
 * Returns a 403 NextResponse if enforcement is enabled and the IP is not allowed,
 * or null if the check passes (or enforcement is disabled).
 */
export function checkAdminIpAllowlist(request: Request): NextResponse | null {
  const enforce = process.env.ADMIN_IP_ENFORCE === "true";
  if (!enforce) return null;

  const allowlistRaw = process.env.ADMIN_IP_ALLOWLIST ?? "";
  const allowlist = allowlistRaw
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);

  const clientIp = getClientIp(request);

  if (!allowlist.includes(clientIp)) {
    return NextResponse.json(
      { success: false, error: "Forbidden", message: "Access denied from this IP address" },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Check if the current user has one of the required roles.
 * Returns null if authorized, or a 401/403 NextResponse if not.
 * When the allowedRoles array contains "ADMIN", also enforces the IP allowlist.
 */
export async function requireRole(
  allowedRoles: Role[],
  request?: Request
): Promise<NextResponse | null> {
  // Enforce IP allowlist for admin-only routes
  if (allowedRoles.length === 1 && allowedRoles[0] === "ADMIN" && request) {
    const ipCheck = checkAdminIpAllowlist(request);
    if (ipCheck) return ipCheck;
  }

  let session: any = null;
  if (request) {
    const { getToken } = await import("next-auth/jwt");
    const cookieHeader = request.headers.get("cookie") || "";
    let cookieName = "authjs.session-token";
    if (cookieHeader.includes("__Secure-authjs.session-token")) {
      cookieName = "__Secure-authjs.session-token";
    } else if (cookieHeader.includes("__Secure-next-auth.session-token")) {
      cookieName = "__Secure-next-auth.session-token";
    } else if (cookieHeader.includes("next-auth.session-token")) {
      cookieName = "next-auth.session-token";
    }

    const token = await getToken({
      req: request as any,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
      secureCookie: cookieName.startsWith("__Secure-"),
      salt: cookieName,
      cookieName,
    });
    if (token) session = { user: token };
  }
  if (!session) {
    session = await auth();
  }

  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", message: "Authentication required" },
      { status: 401 }
    );
  }

  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json(
      { success: false, error: "Forbidden", message: "Insufficient permissions" },
      { status: 403 }
    );
  }

  return null; // Authorized
}

/**
 * Get the current authenticated session or return 401.
 * Returns the session if authenticated, or a tuple with error response.
 */
export async function requireAuth(request?: Request) {
  let session: any = null;
  if (request) {
    const { getToken } = await import("next-auth/jwt");
    const cookieHeader = request.headers.get("cookie") || "";
    let cookieName = "authjs.session-token";
    if (cookieHeader.includes("__Secure-authjs.session-token")) {
      cookieName = "__Secure-authjs.session-token";
    } else if (cookieHeader.includes("__Secure-next-auth.session-token")) {
      cookieName = "__Secure-next-auth.session-token";
    } else if (cookieHeader.includes("next-auth.session-token")) {
      cookieName = "next-auth.session-token";
    }

    const token = await getToken({
      req: request as any,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
      secureCookie: cookieName.startsWith("__Secure-"),
      salt: cookieName,
      cookieName,
    });
    if (token) session = { user: token };
  }
  if (!session) {
    session = await auth();
  }

  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  return { session, error: null };
}
