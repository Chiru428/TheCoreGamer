/**
 * Tests for POST /api/analytics/affiliate-click and GET /api/analytics/affiliate-stats
 * Mocks prisma, requireRole, csrfProtection, rateLimit, withRetry, sentry.
 */

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockAffiliateClickCreate = jest.fn();
const mockAffiliateClickGroupBy = jest.fn();
const mockAffiliateClickCount = jest.fn();
const mockArticleFindUnique = jest.fn();
const mockArticleFindMany = jest.fn();
const mockGameFindUnique = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    affiliateClick: {
      create: (...args: unknown[]) => mockAffiliateClickCreate(...args),
      groupBy: (...args: unknown[]) => mockAffiliateClickGroupBy(...args),
      count: (...args: unknown[]) => mockAffiliateClickCount(...args),
    },
    article: {
      findUnique: (...args: unknown[]) => mockArticleFindUnique(...args),
      findMany: (...args: unknown[]) => mockArticleFindMany(...args),
    },
    game: {
      findUnique: (...args: unknown[]) => mockGameFindUnique(...args),
    },
  },
}));

jest.mock("@/lib/withRetry", () => ({
  withRetry: (fn: () => unknown) => fn(),
}));

// ── requireRole mock ─────────────────────────────────────────────────────────
const mockRequireRole = jest.fn();
jest.mock("@/middleware/requireRole", () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

// ── csrfProtection / rateLimit / sentry / redis mocks ────────────────────────
const mockRateLimit = jest.fn();
jest.mock("@/middleware/csrfProtection", () => ({
  csrfProtection: jest.fn().mockReturnValue(null),
}));
jest.mock("@/middleware/rateLimit", () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}));
jest.mock("@/lib/redis", () => ({
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/sentry", () => ({ captureError: jest.fn() }));

// ── Auth mock — avoids pulling in real next-auth (ESM-only, breaks Jest) ─────
jest.mock("@/lib/auth", () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

import { POST as recordClick } from "@/app/api/analytics/affiliate-click/route";
import { GET as getStats } from "@/app/api/analytics/affiliate-stats/route";
import { NextRequest } from "next/server";

function makePost(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/analytics/affiliate-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const baseClickBody = {
  url: "https://store.steampowered.com/app/123",
  store: "Steam",
  ipAddress: "1.2.3.4",
};

// ── POST /api/analytics/affiliate-click ──────────────────────────────────────
describe("POST /api/analytics/affiliate-click", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimit.mockResolvedValue(null);
    mockAffiliateClickCreate.mockResolvedValue({ id: "click-1" });
  });

  it("records a click with store, url, and articleId when articleSlug is provided", async () => {
    mockArticleFindUnique.mockResolvedValue({ id: "article-1" });
    mockGameFindUnique.mockResolvedValue(null);

    const res = await recordClick(makePost({ ...baseClickBody, articleSlug: "best-deals" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const createArgs = mockAffiliateClickCreate.mock.calls[0][0];
    expect(createArgs.data.url).toBe(baseClickBody.url);
    expect(createArgs.data.store).toBe(baseClickBody.store);
    expect(createArgs.data.articleId).toBe("article-1");
  });

  it("records a click without articleId when articleSlug is not provided", async () => {
    const res = await recordClick(makePost(baseClickBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // No slug provided — article lookup should not even run
    expect(mockArticleFindUnique).not.toHaveBeenCalled();

    const createArgs = mockAffiliateClickCreate.mock.calls[0][0];
    expect(createArgs.data.articleId).toBeNull();
  });

  it("returns 429 when rate limited", async () => {
    const { NextResponse } = await import("next/server");
    mockRateLimit.mockResolvedValue(
      NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 })
    );

    const res = await recordClick(makePost(baseClickBody));
    expect(res.status).toBe(429);
    expect(mockAffiliateClickCreate).not.toHaveBeenCalled();
  });

  it("returns { success: true } on success", async () => {
    const res = await recordClick(makePost(baseClickBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ── GET /api/analytics/affiliate-stats ───────────────────────────────────────
describe("GET /api/analytics/affiliate-stats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 403 for non-admin/editor", async () => {
    const { NextResponse } = await import("next/server");
    mockRequireRole.mockResolvedValue(
      NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    );

    const res = await getStats(new NextRequest("http://localhost/api/analytics/affiliate-stats"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns click counts grouped by store", async () => {
    mockRequireRole.mockResolvedValue(null);
    mockAffiliateClickGroupBy
      .mockResolvedValueOnce([
        { store: "Steam", _count: { id: 10 } },
        { store: "GOG", _count: { id: 4 } },
      ])
      .mockResolvedValueOnce([]);
    mockAffiliateClickCount.mockResolvedValue(14);
    mockArticleFindMany.mockResolvedValue([]);

    const res = await getStats(new NextRequest("http://localhost/api/analytics/affiliate-stats"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.clicksByStore).toEqual([
      { store: "Steam", clicks: 10 },
      { store: "GOG", clicks: 4 },
    ]);
    expect(body.data.totalClicks).toBe(14);
  });

  it("filters to the last 30 days", async () => {
    mockRequireRole.mockResolvedValue(null);
    mockAffiliateClickGroupBy.mockResolvedValue([]);
    mockAffiliateClickCount.mockResolvedValue(0);
    mockArticleFindMany.mockResolvedValue([]);

    const before = Date.now();
    const res = await getStats(new NextRequest("http://localhost/api/analytics/affiliate-stats"));
    const after = Date.now();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.periodDays).toBe(30);

    // Every grouped/counted query filters createdAt >= ~30 days ago
    for (const call of mockAffiliateClickGroupBy.mock.calls) {
      const gte: Date = call[0].where.createdAt.gte;
      const expected = before - 30 * 24 * 60 * 60 * 1000;
      expect(gte.getTime()).toBeGreaterThanOrEqual(expected - 1000);
      expect(gte.getTime()).toBeLessThanOrEqual(after - 30 * 24 * 60 * 60 * 1000 + 1000);
    }
    const countArgs = mockAffiliateClickCount.mock.calls[0][0];
    expect(countArgs.where.createdAt.gte).toBeInstanceOf(Date);
  });
});
