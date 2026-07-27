/**
 * Tests for:
 * - PUT /api/user/profile — 30-day username change cooldown
 * - POST /api/user/unlink-provider — requires a password to be set
 */

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockFindUnique = jest.fn();
const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

// ── requireAuth mock ─────────────────────────────────────────────────────────
const mockRequireAuth = jest.fn();
jest.mock("@/middleware/requireRole", () => ({
  requireAuth: () => mockRequireAuth(),
}));

// ── csrf / rate limit / sentry mocks ─────────────────────────────────────────
jest.mock("@/middleware/csrfProtection", () => ({
  csrfProtection: jest.fn().mockReturnValue(null),
}));
jest.mock("@/middleware/rateLimit", () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}));
jest.mock("@/lib/sentry", () => ({ captureError: jest.fn() }));

import { PUT } from "@/app/api/user/profile/route";
import { POST as UNLINK } from "@/app/api/user/unlink-provider/route";
import { NextRequest } from "next/server";

const session = { user: { id: "user-1", role: "USER" } };

function makePut(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/user/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeUnlink(): NextRequest {
  return new NextRequest("http://localhost/api/user/unlink-provider", { method: "POST" });
}

const updatedUserRow = {
  id: "user-1",
  email: "test@example.com",
  username: "newname",
  displayName: "Test User",
  avatarUrl: null,
  bio: null,
  role: "USER",
  emailVerified: true,
  twoFactorEnabled: false,
  oauthProvider: null,
  premiumUntil: null,
  createdAt: new Date(),
  lastLoginAt: null,
  usernameChangedAt: new Date(),
  passwordHash: "$2b$12$hash",
};

describe("PUT /api/user/profile — username cooldown", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ session, error: null });
    mockUpdate.mockResolvedValue(updatedUserRow);
  });

  it("rejects a username change within 30 days with 429 and nextAllowedAt", async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    mockFindUnique.mockResolvedValue({ username: "oldname", usernameChangedAt: tenDaysAgo });

    const res = await PUT(makePut({ username: "newname" }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/once every 30 days/i);

    const expectedNext = new Date(tenDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000);
    expect(body.nextAllowedAt).toBe(expectedNext.toISOString());
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("allows a username change after 30 days and stamps usernameChangedAt", async () => {
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    mockFindUnique.mockResolvedValue({ username: "oldname", usernameChangedAt: fortyDaysAgo });
    mockFindFirst.mockResolvedValue(null); // username not taken

    const res = await PUT(makePut({ username: "newname" }));
    expect(res.status).toBe(200);

    const updateArgs = mockUpdate.mock.calls[0][0];
    expect(updateArgs.data.username).toBe("newname");
    expect(updateArgs.data.usernameChangedAt).toBeInstanceOf(Date);
  });

  it("allows the first-ever username change (no usernameChangedAt yet)", async () => {
    mockFindUnique.mockResolvedValue({ username: "oldname", usernameChangedAt: null });
    mockFindFirst.mockResolvedValue(null);

    const res = await PUT(makePut({ username: "newname" }));
    expect(res.status).toBe(200);
  });

  it("does not rate-limit displayName changes even during cooldown", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    mockFindUnique.mockResolvedValue({ username: "oldname", usernameChangedAt: yesterday });

    const res = await PUT(makePut({ displayName: "New Display Name" }));
    expect(res.status).toBe(200);

    const updateArgs = mockUpdate.mock.calls[0][0];
    expect(updateArgs.data.displayName).toBe("New Display Name");
    expect(updateArgs.data.username).toBeUndefined();
    expect(updateArgs.data.usernameChangedAt).toBeUndefined();
  });

  it("treats submitting the unchanged username as a no-op (no cooldown stamp)", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    mockFindUnique.mockResolvedValue({ username: "samename", usernameChangedAt: yesterday });

    const res = await PUT(makePut({ username: "samename", displayName: "Test" }));
    expect(res.status).toBe(200);

    const updateArgs = mockUpdate.mock.calls[0][0];
    expect(updateArgs.data.username).toBeUndefined();
    expect(updateArgs.data.usernameChangedAt).toBeUndefined();
  });
});

describe("POST /api/user/unlink-provider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ session, error: null });
  });

  it("returns 409 when the user has no password set", async () => {
    mockFindUnique.mockResolvedValue({ oauthProvider: "google", passwordHash: null });

    const res = await UNLINK(makeUnlink());
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/set a password first/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when no provider is linked", async () => {
    mockFindUnique.mockResolvedValue({ oauthProvider: null, passwordHash: "$2b$12$hash" });

    const res = await UNLINK(makeUnlink());
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("clears oauthProvider and oauthId when a password is set", async () => {
    mockFindUnique.mockResolvedValue({ oauthProvider: "discord", passwordHash: "$2b$12$hash" });
    mockUpdate.mockResolvedValue({});

    const res = await UNLINK(makeUnlink());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const updateArgs = mockUpdate.mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id: "user-1" });
    expect(updateArgs.data).toEqual({ oauthProvider: null, oauthId: null });
  });
});
