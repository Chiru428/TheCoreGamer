/**
 * Tests for the sessionVersion invalidation logic in
 * backend/src/lib/auth-callbacks.ts: jwtCallback (sets/refreshes token.sv,
 * throttled re-check, marks token.invalid when sessionVersion no longer
 * matches) and sessionCallback (returns null when the token is invalid).
 */

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockFindUnique = jest.fn();
const mockFindFirst = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

import { jwtCallback, sessionCallback } from "@/lib/auth-callbacks";

describe("jwtCallback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("on first sign-in, copies sessionVersion onto the token and stamps svCheckedAt", async () => {
    mockFindUnique.mockResolvedValue({
      id: "user-1",
      role: "USER",
      username: "alice",
      displayName: "Alice",
      sessionVersion: 3,
    });

    const token: any = {};
    const result = await jwtCallback({
      token,
      user: { email: "alice@example.com" },
      account: { provider: "credentials" },
    });

    expect(result.id).toBe("user-1");
    expect(result.sv).toBe(3);
    expect(typeof result.svCheckedAt).toBe("number");
  });

  it("does not re-check the DB when svCheckedAt is recent", async () => {
    const token: any = { id: "user-1", sv: 3, svCheckedAt: Date.now() };

    const result = await jwtCallback({ token, user: undefined, account: undefined });

    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(result.invalid).toBeUndefined();
  });

  it("marks the token invalid when a stale sessionVersion no longer matches the DB", async () => {
    const sixMinutesAgo = Date.now() - 6 * 60 * 1000;
    const token: any = { id: "user-1", sv: 3, svCheckedAt: sixMinutesAgo };

    mockFindUnique.mockResolvedValue({ sessionVersion: 4 }); // bumped via "sign out everywhere"

    const result = await jwtCallback({ token, user: undefined, account: undefined });

    expect(mockFindUnique).toHaveBeenCalledTimes(1);
    expect(result.invalid).toBe(true);
  });

  it("leaves the token valid when a stale check finds the same sessionVersion", async () => {
    const sixMinutesAgo = Date.now() - 6 * 60 * 1000;
    const token: any = { id: "user-1", sv: 3, svCheckedAt: sixMinutesAgo };

    mockFindUnique.mockResolvedValue({ sessionVersion: 3 });

    const result = await jwtCallback({ token, user: undefined, account: undefined });

    expect(result.invalid).toBeUndefined();
    expect(result.svCheckedAt).toBeGreaterThan(sixMinutesAgo);
  });
});

describe("sessionCallback", () => {
  it("returns null when the token has been marked invalid", async () => {
    const result = await sessionCallback({
      session: { user: {} },
      token: { invalid: true, id: "user-1" },
    });

    expect(result).toBeNull();
  });

  it("populates session.user from a valid token", async () => {
    const session: any = { user: {} };
    const result = await sessionCallback({
      session,
      token: { id: "user-1", role: "USER", username: "alice", displayName: "Alice" },
    });

    expect(result.user).toEqual({
      id: "user-1",
      role: "USER",
      username: "alice",
      displayName: "Alice",
    });
  });
});
