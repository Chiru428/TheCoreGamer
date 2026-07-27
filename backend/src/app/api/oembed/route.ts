import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { rateLimit } from "@/middleware/rateLimit";
import { cacheGet, cacheSet } from "@/lib/redis";
import { CACHE_TTL } from "@/lib/constants";
import { successResponse, errorResponse } from "@/types";
import { captureError } from "@/lib/sentry";
import { logger } from "@/lib/logger";

const TWITTER_HOSTS = new Set(["twitter.com", "www.twitter.com", "mobile.twitter.com", "x.com", "www.x.com"]);
const BLUESKY_HOSTS = new Set(["bsky.app", "www.bsky.app"]);
const REDDIT_HOSTS = new Set(["reddit.com", "www.reddit.com", "old.reddit.com"]);

type Platform = "twitter" | "reddit" | "bluesky";

function detectPlatform(url: URL): Platform | null {
  const host = url.hostname.toLowerCase();
  if (TWITTER_HOSTS.has(host)) return "twitter";
  if (REDDIT_HOSTS.has(host) && /\/r\/[^/]+\/comments\//i.test(url.pathname)) return "reddit";
  if (BLUESKY_HOSTS.has(host) && /^\/profile\/[^/]+\/post\/[^/]+/i.test(url.pathname)) return "bluesky";
  return null;
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await rateLimit(request, "OEMBED");
  if (rateLimitResponse) return rateLimitResponse;

  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json(errorResponse("Missing url parameter"), { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return NextResponse.json(errorResponse("Invalid URL"), { status: 400 });
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return NextResponse.json(errorResponse("Invalid URL"), { status: 400 });
  }

  const platform = detectPlatform(parsed);
  if (!platform) {
    return NextResponse.json(
      errorResponse("Unsupported URL", "URL must be a Twitter/X, Bluesky, or Reddit post link"),
      { status: 400 }
    );
  }

  const cacheKey = `oembed:${crypto.createHash("sha256").update(parsed.toString()).digest("hex")}`;

  try {
    const cached = await cacheGet<Record<string, unknown>>(cacheKey);
    if (cached) return NextResponse.json(successResponse(cached));
  } catch {
    /* cache unavailable — fall through to live fetch */
  }

  try {
    let result: Record<string, unknown> | null = null;
    if (platform === "twitter") result = await fetchTwitterOEmbed(parsed.toString());
    else if (platform === "reddit") result = await fetchRedditOEmbed(parsed.toString());
    else result = await fetchBlueskyPreview(parsed);

    if (!result) {
      return NextResponse.json(errorResponse("Could not fetch embed data for this URL"), { status: 502 });
    }

    try {
      await cacheSet(cacheKey, result, CACHE_TTL.DAY);
    } catch {
      /* cache unavailable — non-fatal */
    }

    return NextResponse.json(successResponse(result));
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)));
    logger.error({ err }, "[oEmbed] Request failed");
    return NextResponse.json(errorResponse("Failed to fetch embed data"), { status: 502 });
  }
}

async function fetchTwitterOEmbed(url: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=1`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    platform: "twitter",
    html: data.html as string,
    authorName: (data.author_name as string) || undefined,
    authorUrl: (data.author_url as string) || undefined,
    thumbnailUrl: (data.thumbnail_url as string) || undefined,
  };
}

async function fetchRedditOEmbed(url: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`https://www.reddit.com/oembed?url=${encodeURIComponent(url)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    platform: "reddit",
    title: (data.title as string) || undefined,
    html: data.html as string,
  };
}

async function fetchBlueskyPreview(url: URL): Promise<Record<string, unknown> | null> {
  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; theCoreGamerBot/1.0; +https://thecoregamer.com)",
      Accept: "text/html",
    },
  });
  if (!res.ok) return null;
  const html = await res.text();

  const ogTag = (property: string): string | undefined => {
    const re1 = new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']*)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:${property}["']`, "i");
    const match = html.match(re1) || html.match(re2);
    return match ? decodeHtmlEntities(match[1]) : undefined;
  };

  const handleMatch = url.pathname.match(/^\/profile\/([^/]+)\/post\//i);
  const handle = handleMatch ? handleMatch[1] : undefined;

  return {
    platform: "bluesky",
    title: ogTag("title"),
    description: ogTag("description"),
    authorName: ogTag("title"),
    authorUrl: handle ? `https://bsky.app/profile/${handle}` : undefined,
    thumbnailUrl: ogTag("image"),
  };
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}
