/**
 * Tests for GET /api/homepage
 * Mocks prisma, rateLimit, redis, withRetry, sentry.
 */

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockFindMany = jest.fn();
const mockPollFindFirst = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    poll: {
      findFirst: (...args: unknown[]) => mockPollFindFirst(...args),
    },
  },
}));

// ── Rate limit mock (always pass) ────────────────────────────────────────────
jest.mock("@/middleware/rateLimit", () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}));

// ── Redis mock (cache miss by default) ───────────────────────────────────────
jest.mock("@/lib/redis", () => ({
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
}));

// ── withRetry / sentry mocks ──────────────────────────────────────────────────
jest.mock("@/lib/withRetry", () => ({
  withRetry: (fn: () => unknown) => fn(),
}));
jest.mock("@/lib/sentry", () => ({ captureError: jest.fn() }));

import { GET } from "@/app/api/homepage/route";
import { NextRequest } from "next/server";
import { cacheGet } from "@/lib/redis";

function makeGet(): NextRequest {
  return new NextRequest(new URL("http://localhost/api/homepage"));
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("GET /api/homepage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (cacheGet as jest.Mock).mockResolvedValue(null);
    mockFindMany.mockResolvedValue([]);
    mockPollFindFirst.mockResolvedValue(null);
  });

  it("returns all 8 data arrays in the response", async () => {
    const res = await GET(makeGet());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const keys = ["featured", "breaking", "latest", "news", "guides", "reviews", "popular"];
    for (const key of keys) {
      expect(body.data).toHaveProperty(key);
      expect(Array.isArray(body.data[key])).toBe(true);
    }
  });

  it("calls prisma 11 times for the 11 content sections", async () => {
    await GET(makeGet());
    expect(mockFindMany).toHaveBeenCalledTimes(11);
  });

  it("queries each content type with correct filters", async () => {
    await GET(makeGet());

    const calls = mockFindMany.mock.calls;
    // Order matches Promise.all in route: featured, breaking, latest, news, guides, reviews, popular
    expect(calls[0][0].where).toMatchObject({ status: "PUBLISHED", featured: true });
    expect(calls[1][0].where).toMatchObject({ status: "PUBLISHED", isBreaking: true });
    expect(calls[3][0].where).toMatchObject({ status: "PUBLISHED", contentType: "NEWS" });
    expect(calls[4][0].where).toMatchObject({ status: "PUBLISHED", contentType: "GUIDE" });
    expect(calls[5][0].where).toMatchObject({ status: "PUBLISHED", contentType: "REVIEW" });
  });

  it("uses Redis cache on second call and skips DB queries", async () => {
    const cachedPayload = {
      featured: [], breaking: [], latest: [], news: [],
      guides: [], reviews: [], popular: [],
    };

    // First call: cache miss → DB runs
    (cacheGet as jest.Mock).mockResolvedValueOnce(null);
    await GET(makeGet());
    expect(mockFindMany).toHaveBeenCalled();

    // Reset call count but keep mock behaviour
    mockFindMany.mockClear();

    // Second call: cache hit → DB skipped
    (cacheGet as jest.Mock).mockResolvedValueOnce(cachedPayload);
    const res = await GET(makeGet());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("returns 500 when Prisma throws", async () => {
    mockFindMany.mockRejectedValue(new Error("DB connection lost"));

    const res = await GET(makeGet());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
