import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // IP allowlisting for /api/admin/*
  if (pathname.startsWith("/api/admin")) {
    const allowList = (process.env.ADMIN_IP_ALLOWLIST || "127.0.0.1,::1")
      .split(",")
      .map((ip) => ip.trim());

    // Trust only the last entry (set by our own load balancer), not user-controlled first entry
    const clientIp =
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
      "127.0.0.1";

    if (process.env.ADMIN_IP_ENFORCE === "true" && !allowList.includes(clientIp)) {
      return NextResponse.json(
        { success: false, error: "Forbidden", message: "IP not allowed" },
        { status: 403 }
      );
    }
  }

  // Protect /admin/* pages — decode JWT and verify ADMIN role
  if (pathname.startsWith("/admin")) {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });

    if (!token) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify the user actually has the ADMIN role — not just any authenticated user
    if (token.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden", message: "Admin access required" },
        { status: 403 }
      );
    }
  }

  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/auth/2fa/:path*"],
};
