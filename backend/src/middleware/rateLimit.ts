import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";
import { RATE_LIMITS, USER_RATE_LIMITS } from "@/lib/constants";
import { logger } from "@/lib/logger";

type RateLimitTier = "READ" | "WRITE" | "AUTH" | "TENOR" | "OEMBED" | "REGISTER" | "LOGIN" | "SEARCH";
type UserRateLimitTier = keyof typeof USER_RATE_LIMITS;

// Create rate limiters for each tier
const limiters: Record<RateLimitTier, Ratelimit> = {
  READ: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.READ.requests, `${RATE_LIMITS.READ.window} s`),
    analytics: true,
    prefix: "ratelimit:read",
  }),
  WRITE: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.WRITE.requests, `${RATE_LIMITS.WRITE.window} s`),
    analytics: true,
    prefix: "ratelimit:write",
  }),
  AUTH: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.AUTH.requests, `${RATE_LIMITS.AUTH.window} s`),
    analytics: true,
    prefix: "ratelimit:auth",
  }),
  TENOR: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.TENOR.requests, `${RATE_LIMITS.TENOR.window} s`),
    analytics: true,
    prefix: "ratelimit:tenor",
  }),
  OEMBED: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.OEMBED.requests, `${RATE_LIMITS.OEMBED.window} s`),
    analytics: true,
    prefix: "ratelimit:oembed",
  }),
  REGISTER: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.REGISTER.requests, `${RATE_LIMITS.REGISTER.window} s`),
    analytics: true,
    prefix: "ratelimit:register",
  }),
  LOGIN: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.LOGIN.requests, `${RATE_LIMITS.LOGIN.window} s`),
    analytics: true,
    prefix: "ratelimit:login",
  }),
  SEARCH: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.SEARCH.requests, `${RATE_LIMITS.SEARCH.window} s`),
    analytics: true,
    prefix: "ratelimit:search",
  }),
};

// Per-user rate limiters (AI writing assistant features)
const userLimiters: Record<UserRateLimitTier, Ratelimit> = {
  AI_STANDARD: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      USER_RATE_LIMITS.AI_STANDARD.requests,
      `${USER_RATE_LIMITS.AI_STANDARD.window} s`
    ),
    analytics: true,
    prefix: "ratelimit:ai-standard",
  }),
  AI_REWRITE: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      USER_RATE_LIMITS.AI_REWRITE.requests,
      `${USER_RATE_LIMITS.AI_REWRITE.window} s`
    ),
    analytics: true,
    prefix: "ratelimit:ai-rewrite",
  }),
};

/**
 * FIX: trust x-real-ip first (injected by our infra), then fall back to the LAST
 * entry in x-forwarded-for (also set by our own load balancer), never the first
 * entry which is user-controlled and can be spoofed to bypass rate limiting.
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the LAST entry — set by our load balancer, not user-controlled
    const entries = forwarded.split(",");
    return entries[entries.length - 1].trim();
  }

  return "127.0.0.1";
}

export async function rateLimit(
  request: Request,
  tier: RateLimitTier = "READ"
): Promise<NextResponse | null> {
  try {
    const ip = getClientIp(request);
    const limiter = limiters[tier];
    const { success, limit, remaining, reset } = await limiter.limit(ip);

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests",
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(reset),
          },
        }
      );
    }

    return null; // No rate limit hit
  } catch {
    // If Redis is down, allow the request through
    logger.warn("Rate limiter unavailable, allowing request");
    return null;
  }
}

export function getRateLimitHeaders(
  limit: number,
  remaining: number,
  reset: number
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(reset),
  };
}

/**
 * Per-user rate limiting for AI writing assistant endpoints.
 */
export async function rateLimitUser(
  userId: string,
  tier: UserRateLimitTier
): Promise<NextResponse | null> {
  try {
    const limiter = userLimiters[tier];
    const { success, limit, reset } = await limiter.limit(userId);

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests",
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(reset),
          },
        }
      );
    }

    return null;
  } catch {
    logger.warn("Rate limiter unavailable, allowing request");
    return null;
  }
}
