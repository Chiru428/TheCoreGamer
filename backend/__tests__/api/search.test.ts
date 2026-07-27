/**
 * Tests for GET /api/search
 * Mocks prisma, rateLimit, redis, withRetry, sentry.
 */

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockQueryRawUnsafe = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRawUnsafe: (...args: unknown[]) => mockQueryRawUnsafe(...args),
    article: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

// ── Rate limit mock (always pass) ────────────────────────────────────────────
jest.mock("@/middleware/rateLimit", () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}));

// ── Redis mock (always miss) ──────────────────────────────────────────────────
jest.mock("@/lib/redis", () => ({
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  cacheDeletePattern: jest.fn().mockResolvedValue(undefined),
}));

// ── withRetry / sentry mocks ──────────────────────────────────────────────────
jest.mock("@/lib/withRetry", () => ({
  withRetry: (fn: () => unknown) => fn(),
}));
jest.mock("@/lib/sentry", () => ({ captureError: jest.fn() }));

// ── Algolia mock — search rejects so every test exercises the Postgres
// fallback path (these tests assert against $queryRawUnsafe, not Algolia) ───
jest.mock("@/lib/algolia", () => ({
  algoliaClient: { search: jest.fn().mockRejectedValue(new Error("Algolia unavailable in tests")) },
  ARTICLES_INDEX: "articles",
  ARTICLES_NEWEST: "articles_publishedAt_desc",
  ARTICLES_POPULAR: "articles_viewCount_desc",
  ARTICLES_TOP_RATED: "articles_reviewScore_desc",
  GAMES_INDEX: "games",
  TAGS_INDEX: "tags",
  USERS_INDEX: "users",
  VIDEOS_INDEX: "videos",
}));

import { GET } from "@/app/api/search/route";
import { NextRequest } from "next/server";
import { rateLimit } from "@/middleware/rateLimit";

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/search");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

// A row shape matching the tsvector SELECT
const searchRow = {
  id: "art-1",
  title: "Test Article",
  slug: "test-article",
  excerpt: "An excerpt",
  contentType: "NEWS",
  featuredImageUrl: null,
  publishedAt: new Date("2026-01-01"),
  content: {},
  authorDisplayName: "Author",
  authorAvatarUrl: null,
  total: BigInt(5),
};

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("GET /api/search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue(null);
  });

  it("returns 400 when q param is missing", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 when q is empty string", async () => {
    const res = await GET(makeGet({ q: "" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("calls prisma.$queryRawUnsafe when tsvector path runs", async () => {
    mockQueryRawUnsafe.mockResolvedValue([searchRow]);

    const res = await GET(makeGet({ q: "minecraft" }));

    expect(res.status).toBe(200);
    expect(mockQueryRawUnsafe).toHaveBeenCalledTimes(1);
    const sql: string = mockQueryRawUnsafe.mock.calls[0][0];
    expect(sql).toContain("searchVector");
    expect(sql).toContain("plainto_tsquery");
  });

  it("falls back to ILIKE when tsvector returns 0 rows", async () => {
    // First call (tsvector) returns nothing; second call (ILIKE) returns results
    mockQueryRawUnsafe
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([searchRow]);

    const res = await GET(makeGet({ q: "ets2" }));

    expect(res.status).toBe(200);
    expect(mockQueryRawUnsafe).toHaveBeenCalledTimes(2);
    const secondCallSql: string = mockQueryRawUnsafe.mock.calls[1][0];
    expect(secondCallSql).toContain("ILIKE");
  });

  it("respects contentType filter param", async () => {
    mockQueryRawUnsafe.mockResolvedValue([{ ...searchRow, contentType: "REVIEW" }]);

    await GET(makeGet({ q: "game review", contentType: "REVIEW" }));

    expect(mockQueryRawUnsafe).toHaveBeenCalledTimes(1);
    // params are spread after the SQL string: [sql, q, contentType, ...]
    const callArgs = mockQueryRawUnsafe.mock.calls[0];
    expect(callArgs).toContain("REVIEW");
  });

  it("returns paginated results with correct meta", async () => {
    const rows = [1, 2, 3].map((i) => ({ ...searchRow, id: `art-${i}`, total: BigInt(3) }));
    mockQueryRawUnsafe.mockResolvedValue(rows);

    const res = await GET(makeGet({ q: "news", page: "0", hitsPerPage: "10" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.articles).toHaveLength(3);
    expect(body.pagination.total).toBe(3);
    expect(body.pagination.page).toBe(1);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const { NextResponse } = await import("next/server");
    (rateLimit as jest.Mock).mockResolvedValueOnce(
      NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 })
    );

    const res = await GET(makeGet({ q: "test" }));
    expect(res.status).toBe(429);
  });
});
