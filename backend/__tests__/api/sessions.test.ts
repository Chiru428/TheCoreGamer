/**
 * Tests for:
 * - GET /api/user/sessions
 * - POST /api/user/sessions/revoke-all
 */

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockUserUpdate = jest.fn();
const mockDeviceFindMany = jest.fn();
const mockDeviceUpdateMany = jest.fn();
const mockTransaction = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    userDevice: {
      findMany: (...args: unknown[]) => mockDeviceFindMany(...args),
      updateMany: (...args: unknown[]) => mockDeviceUpdateMany(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
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

// ── rate limit & sentry mocks ────────────────────────────────────────────────
jest.mock("@/middleware/rateLimit", () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
  getClientIp: jest.fn().mockReturnValue("127.0.0.1"),
}));
jest.mock("@/lib/sentry", () => ({ captureError: jest.fn() }));

import { GET } from "@/app/api/user/sessions/route";
import { POST } from "@/app/api/user/sessions/revoke-all/route";
import { NextRequest } from "next/server";

function makeRequest(url: string, method = "GET"): NextRequest {
  return new NextRequest(url, { method });
}

const session = { user: { id: "user-1", role: "USER" } };

describe("GET /api/user/sessions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { NextResponse } = await import("next/server");
    mockRequireAuth.mockResolvedValue({
      session: null,
      error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    });

    const res = await GET(makeRequest("http://localhost/api/user/sessions"));
    expect(res.status).toBe(401);
  });

  it("returns the user's devices, newest first, with parsed UA and revoked status", async () => {
    mockRequireAuth.mockResolvedValue({ session, error: null });
    mockDeviceFindMany.mockResolvedValue([
      {
        id: "device-2",
        userId: "user-1",
        deviceHash: "hash2",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36",
        ipAddress: "198.51.100.0/24",
        lastSeenAt: new Date("2026-06-10T12:00:00Z"),
        createdAt: new Date("2026-06-10T12:00:00Z"),
        revokedAt: null,
      },
      {
        id: "device-1",
        userId: "user-1",
        deviceHash: "hash1",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1",
        ipAddress: "203.0.113.0/24",
        lastSeenAt: new Date("2026-06-01T12:00:00Z"),
        createdAt: new Date("2026-06-01T12:00:00Z"),
        revokedAt: new Date("2026-06-05T00:00:00Z"),
      },
    ]);

    const res = await GET(makeRequest("http://localhost/api/user/sessions"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([
      {
        id: "device-2",
        browser: "Chrome",
        os: "Windows",
        deviceType: "desktop",
        ipAddress: "198.51.100.0/24",
        lastSeenAt: "2026-06-10T12:00:00.000Z",
        createdAt: "2026-06-10T12:00:00.000Z",
        revoked: false,
        isCurrent: false,
      },
      {
        id: "device-1",
        browser: "Safari",
        os: "iOS",
        deviceType: "mobile",
        ipAddress: "203.0.113.0/24",
        lastSeenAt: "2026-06-01T12:00:00.000Z",
        createdAt: "2026-06-01T12:00:00.000Z",
        revoked: true,
        isCurrent: false,
      },
    ]);

    const findManyArgs = mockDeviceFindMany.mock.calls[0][0];
    expect(findManyArgs.where).toEqual({ userId: "user-1" });
    expect(findManyArgs.orderBy).toEqual({ lastSeenAt: "desc" });
  });
});

describe("POST /api/user/sessions/revoke-all", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { NextResponse } = await import("next/server");
    mockRequireAuth.mockResolvedValue({
      session: null,
      error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    });

    const res = await POST(makeRequest("http://localhost/api/user/sessions/revoke-all", "POST"));
    expect(res.status).toBe(401);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("bumps sessionVersion and revokes all of the user's devices", async () => {
    mockRequireAuth.mockResolvedValue({ session, error: null });
    mockTransaction.mockResolvedValue([{}, { count: 2 }]);

    const res = await POST(makeRequest("http://localhost/api/user/sessions/revoke-all", "POST"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    expect(mockTransaction).toHaveBeenCalledTimes(1);

    const updateArgs = mockUserUpdate.mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id: "user-1" });
    expect(updateArgs.data).toEqual({ sessionVersion: { increment: 1 } });

    const updateManyArgs = mockDeviceUpdateMany.mock.calls[0][0];
    expect(updateManyArgs.where).toEqual({ userId: "user-1", revokedAt: null });
    expect(updateManyArgs.data).toHaveProperty("revokedAt");
    expect(updateManyArgs.data.revokedAt).toBeInstanceOf(Date);
  });
});
