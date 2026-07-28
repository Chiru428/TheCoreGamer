import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.CORS_ORIGIN,
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

export function csrfProtection(request: Request): NextResponse | null {
  const method = request.method;
  // Only check state-mutating methods
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return null;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Allow requests with no origin (server-to-server, curl, Postman in dev)
  // Set CSRF_STRICT=true to enforce strict CSRF checking even in development.
  // Note: in development without this flag, requests without Origin/Referer are
  // allowed through (e.g. Postman, curl, automated scripts). This differs from
  // production behaviour — use CSRF_STRICT=true to match production locally.
  if (!origin && !referer) {
    const isStrict = process.env.NODE_ENV === "production" || process.env.CSRF_STRICT === "true";
    if (isStrict) {
      return NextResponse.json({ error: "CSRF: missing origin" }, { status: 403 });
    }
    return null; // allow in development (unless CSRF_STRICT=true)
  }

  const sourceUrl = origin || referer || "";
  const isAllowed = ALLOWED_ORIGINS.some((allowed) => sourceUrl.startsWith(allowed));
  if (!isAllowed) {
    return NextResponse.json({ error: "CSRF: origin not allowed" }, { status: 403 });
  }
  return null;
}
