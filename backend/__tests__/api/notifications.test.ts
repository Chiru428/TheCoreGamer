/**
 * Tests for GET and PATCH /api/user/notifications/inbox
 * Mocks prisma, requireAuth, csrfProtection, and sentry.
 */

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockUpdateMany = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    inAppNotification: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}));

// ── requireAuth mock ─────────────────────────────────────────────────────────
const mockRequireAuth = jest.fn();
jest.mock("@/middleware/requireRole", () => ({
  requireAuth: () => mockRequireAuth(),
}));

// ── csrfProtection mock (always pass) ────────────────────────────────────────
jest.mock("@/middleware/csrfProtection", () => ({
  csrfProtection: jest.fn().mockReturnValue(null),
}));

// ── Redis / rate limit / sentry mocks ────────────────────────────────────────
jest.mock("@/lib/redis", () => ({
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/middleware/rateLimit", () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}));
jest.mock("@/lib/sentry", () => ({ captureError: jest.fn() }));

import { GET, PATCH } from "@/app/api/user/notifications/inbox/route";
import { NextRequest } from "next/server";

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/user/notifications/inbox");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

function makePatch(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/user/notifications/inbox", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const session = { user: { id: "user-1", role: "USER" } };

const notif1 = {
  id: "notif-1",
  userId: "user-1",
  type: "COMMENT_REPLY",
  isRead: false,
  createdAt: new Date("2026-01-02T00:00:00Z"),
};
const notif2 = {
  id: "notif-2",
  userId: "user-1",
  type: "ARTICLE_PUBLISHED",
  isRead: false,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

// ── GET Tests ─────────────────────────────────────────────────────────────────
describe("GET /api/user/notifications/inbox", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { NextResponse } = await import("next/server");
    mockRequireAuth.mockResolvedValue({
      session: null,
      error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns { notifications: [], unreadCount: 0 } for a user with no notifications", async () => {
    mockRequireAuth.mockResolvedValue({ session, error: null });
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ notifications: [], unreadCount: 0 });
  });

  it("returns unread notifications ordered by createdAt desc", async () => {
    mockRequireAuth.mockResolvedValue({ session, error: null });
    mockFindMany.mockResolvedValue([notif1, notif2]);
    mockCount.mockResolvedValue(2);

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.notifications).toEqual(
      [notif1, notif2].map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }))
    );
    expect(body.data.unreadCount).toBe(2);

    const findManyArgs = mockFindMany.mock.calls[0][0];
    expect(findManyArgs.where).toEqual({ userId: "user-1" });
    expect(findManyArgs.orderBy).toEqual({ createdAt: "desc" });

    const countArgs = mockCount.mock.calls[0][0];
    expect(countArgs.where).toEqual({ userId: "user-1", isRead: false });
  });
});

// ── PATCH Tests ───────────────────────────────────────────────────────────────
describe("PATCH /api/user/notifications/inbox", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("markAllRead: true sets all isRead = true for the user", async () => {
    mockRequireAuth.mockResolvedValue({ session, error: null });
    mockUpdateMany.mockResolvedValue({ count: 3 });

    const res = await PATCH(makePatch({ markAllRead: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const updateArgs = mockUpdateMany.mock.calls[0][0];
    expect(updateArgs.where).toEqual({ userId: "user-1", isRead: false });
    expect(updateArgs.data).toEqual({ isRead: true });
  });

  it("PATCH with { id } marks just that notification as read", async () => {
    mockRequireAuth.mockResolvedValue({ session, error: null });
    mockUpdateMany.mockResolvedValue({ count: 1 });

    const res = await PATCH(makePatch({ id: "notif-1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const updateArgs = mockUpdateMany.mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id: "notif-1", userId: "user-1" });
    expect(updateArgs.data).toEqual({ isRead: true });
  });

  it("returns 401 when not authenticated", async () => {
    const { NextResponse } = await import("next/server");
    mockRequireAuth.mockResolvedValue({
      session: null,
      error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    });

    const res = await PATCH(makePatch({ markAllRead: true }));
    expect(res.status).toBe(401);
  });
});
