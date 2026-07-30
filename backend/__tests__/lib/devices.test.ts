/**
 * Tests for backend/src/lib/devices.ts:
 * - hashDevice stability
 * - anonymizeIp (IPv4 -> /24, IPv6 -> /48)
 * - recordLoginDevice's isNewDevice logic (first login = no alert, second device = alert)
 */

import crypto from "crypto";

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockFindUnique = jest.fn();
const mockUpsert = jest.fn();
const mockFindFirst = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    userDevice: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

// ── getClientIp mock ─────────────────────────────────────────────────────────
const mockGetClientIp = jest.fn();
jest.mock("@/middleware/rateLimit", () => ({
  getClientIp: (...args: unknown[]) => mockGetClientIp(...args),
}));

import { anonymizeIp, hashDevice, parseUserAgent, recordLoginDevice } from "@/lib/devices";

function makeRequest(userAgent: string): Request {
  return new Request("http://localhost/api/auth/login", {
    headers: { "user-agent": userAgent },
  });
}

describe("anonymizeIp", () => {
  it("anonymizes IPv4 addresses to a /24 prefix", () => {
    expect(anonymizeIp("192.168.1.55")).toBe("192.168.1.0/24");
  });

  it("anonymizes IPv6 addresses to a /48 prefix", () => {
    expect(anonymizeIp("2001:db8:85a3::8a2e:370:7334")).toBe("2001:db8:85a3::/48");
  });

  it("handles loopback IPv6 addresses", () => {
    expect(anonymizeIp("::1")).toBe("0:0:0::/48");
  });
});

describe("hashDevice", () => {
  it("is stable for the same userAgent", () => {
    const a = hashDevice("Mozilla/5.0");
    const b = hashDevice("Mozilla/5.0");
    expect(a).toBe(b);
  });

  it("matches a direct sha256 of userAgent", () => {
    const expected = crypto.createHash("sha256").update("Mozilla/5.0").digest("hex");
    expect(hashDevice("Mozilla/5.0")).toBe(expected);
  });

  it("differs when the userAgent changes", () => {
    const base = hashDevice("Mozilla/5.0");
    expect(hashDevice("Chrome/120.0")).not.toBe(base);
  });
});

describe("parseUserAgent", () => {
  it("identifies Chrome on Windows", () => {
    expect(parseUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36"))
      .toEqual({ browser: "Chrome", os: "Windows", deviceType: "desktop" });
  });

  it("falls back to Unknown for unrecognized user agents", () => {
    expect(parseUserAgent("")).toEqual({ browser: "Unknown browser", os: "Unknown OS", deviceType: "desktop" });
  });
});

describe("recordLoginDevice", () => {
  const userId = "user-1";

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClientIp.mockReturnValue("203.0.113.10");
  });

  it("first-ever login: creates a device and does not flag isNewDevice (no alert)", async () => {
    mockFindUnique.mockResolvedValue(null); // no existing device row
    mockUpsert.mockResolvedValue({
      id: "device-1",
      userId,
      deviceHash: "hash1",
      userAgent: "Mozilla/5.0",
      ipAddress: "203.0.113.0/24",
      lastSeenAt: new Date(),
      createdAt: new Date(),
      revokedAt: null,
    });
    mockFindFirst.mockResolvedValue(null); // no other device exists yet

    const result = await recordLoginDevice(userId, makeRequest("Mozilla/5.0"));

    expect(result.isNewDevice).toBe(false);
    expect(mockFindFirst).toHaveBeenCalledTimes(1);
  });

  it("second device, after first device is older than 5 minutes: flags isNewDevice (alert)", async () => {
    mockFindUnique.mockResolvedValue(null); // this device hasn't been seen before
    mockUpsert.mockResolvedValue({
      id: "device-2",
      userId,
      deviceHash: "hash2",
      userAgent: "Chrome/120.0",
      ipAddress: "198.51.100.0/24",
      lastSeenAt: new Date(),
      createdAt: new Date(),
      revokedAt: null,
    });
    // An older device exists (created more than 5 minutes ago)
    mockFindFirst.mockResolvedValue({
      id: "device-1",
      userId,
      deviceHash: "hash1",
      userAgent: "Mozilla/5.0",
      ipAddress: "203.0.113.0/24",
      lastSeenAt: new Date(),
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
      revokedAt: null,
    });

    const result = await recordLoginDevice(userId, makeRequest("Chrome/120.0"));

    expect(result.isNewDevice).toBe(true);
    const findFirstArgs = mockFindFirst.mock.calls[0][0];
    expect(findFirstArgs.where.userId).toBe(userId);
    expect(findFirstArgs.where.id).toEqual({ not: "device-2" });
  });

  it("returning device (existing row): does not flag isNewDevice and skips the recency check", async () => {
    mockFindUnique.mockResolvedValue({
      id: "device-1",
      userId,
      deviceHash: "hash1",
      userAgent: "Mozilla/5.0",
      ipAddress: "203.0.113.0/24",
      lastSeenAt: new Date(Date.now() - 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
      revokedAt: null,
    });
    mockUpsert.mockResolvedValue({
      id: "device-1",
      userId,
      deviceHash: "hash1",
      userAgent: "Mozilla/5.0",
      ipAddress: "203.0.113.0/24",
      lastSeenAt: new Date(),
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
      revokedAt: null,
    });

    const result = await recordLoginDevice(userId, makeRequest("Mozilla/5.0"));

    expect(result.isNewDevice).toBe(false);
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("upserts using a hash derived from the anonymized IP and user agent", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockUpsert.mockResolvedValue({
      id: "device-1",
      userId,
      deviceHash: "irrelevant",
      userAgent: "Mozilla/5.0",
      ipAddress: "203.0.113.0/24",
      lastSeenAt: new Date(),
      createdAt: new Date(),
      revokedAt: null,
    });
    mockFindFirst.mockResolvedValue(null);

    await recordLoginDevice(userId, makeRequest("Mozilla/5.0"));

    const expectedHash = hashDevice("Mozilla/5.0");
    const upsertArgs = mockUpsert.mock.calls[0][0];
    expect(upsertArgs.where).toEqual({ userId_deviceHash: { userId, deviceHash: expectedHash } });
    expect(upsertArgs.create).toMatchObject({
      userId,
      deviceHash: expectedHash,
      userAgent: "Mozilla/5.0",
      ipAddress: "203.0.113.0/24",
    });
  });
});
