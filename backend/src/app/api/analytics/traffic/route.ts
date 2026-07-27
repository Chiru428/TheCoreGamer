import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { fetchGA4Traffic } from "@/lib/ga4";
import { redis } from "@/lib/redis";

function getDaysForRange(range: string, from?: string | null, to?: string | null): string[] {
  const days: string[] = [];
  if (from && to) {
    const start = new Date(from);
    const end = new Date(to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }
  const count = range === "day" ? 1 : range === "month" ? 30 : 7;
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export async function GET(request: NextRequest) {
  try {
    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const range = request.nextUrl.searchParams.get("range") || "week";
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    // Try GA4 first
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.GOOGLE_ANALYTICS_PROPERTY_ID) {
      const ga4Data = await fetchGA4Traffic(range, from || undefined, to || undefined);
      if (ga4Data) {
        return NextResponse.json(successResponse({ range, from: from || undefined, to: to || undefined, data: ga4Data }));
      }
    }

    // Redis fallback — read daily counters tracked by the view endpoint
    const days = getDaysForRange(range, from, to);
    const keys = days.map((d) => `analytics:pageviews:${d}`);
    let data: { date: string; pageViews: number; uniqueVisitors: number }[] = days.map((d) => ({ date: d, pageViews: 0, uniqueVisitors: 0 }));

    try {
      const values = await redis.mget(...keys);
      data = days.map((date, idx) => {
        const views = Number(values[idx] ?? 0);
        return { date, pageViews: views, uniqueVisitors: views };
      });
    } catch {
      // Redis unavailable — return zeroed data rather than an error
    }

    return NextResponse.json(successResponse({ range, from: from || undefined, to: to || undefined, data, source: "Redis" }));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
