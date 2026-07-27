import { NextRequest, NextResponse } from "next/server";
import { injectUtm } from "@/lib/affiliate";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  try {
    const { url, store, articleSlug, gameSlug } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 });
    }
    if (!store || typeof store !== 'string') {
      return NextResponse.json({ success: false, error: "store is required" }, { status: 400 });
    }

    const redirectUrl = injectUtm(url, store);
    // Trust the last X-Forwarded-For entry (set by our load balancer) — the first
    // entry is client-controlled and can be spoofed.
    const xfwd = req.headers.get('x-forwarded-for');
    const ipAddress =
      req.headers.get('x-real-ip') ||
      (xfwd ? xfwd.split(',').pop()?.trim() : null) ||
      '0.0.0.0';

    fetch(`${BACKEND_URL}/api/analytics/affiliate-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: redirectUrl,
        store,
        articleSlug: articleSlug || undefined,
        gameSlug: gameSlug || undefined,
        ipAddress,
        userAgent: req.headers.get('user-agent') || undefined,
        referrer: req.headers.get('referer') || undefined,
      }),
    }).catch(() => {});

    return NextResponse.json({ success: true, redirectUrl });
  } catch (err) {
    console.error("[ANALYTICS ERROR]", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
