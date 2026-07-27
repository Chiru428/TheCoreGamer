/**
 * Tests for POST /api/auth/login
 * Mocks prisma and bcrypt to test all response branches.
 */

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockFindUnique = jest.fn();
const mockDeviceFindUnique = jest.fn();
const mockDeviceUpsert = jest.fn();
const mockDeviceFindFirst = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: jest.fn().mockResolvedValue({}),
    },
    userDevice: {
      findUnique: (...args: unknown[]) => mockDeviceFindUnique(...args),
      upsert: (...args: unknown[]) => mockDeviceUpsert(...args),
      findFirst: (...args: unknown[]) => mockDeviceFindFirst(...args),
    },
  },
}));

// ── bcrypt mock ──────────────────────────────────────────────────────────────
const mockCompare = jest.fn();
jest.mock("bcrypt", () => ({
  compare: (...args: unknown[]) => mockCompare(...args),
}));

// ── Rate limit mock (always pass) ────────────────────────────────────────────
jest.mock("@/middleware/rateLimit", () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
  getClientIp: jest.fn().mockReturnValue("203.0.113.10"),
}));

// ── BullMQ mock ──────────────────────────────────────────────────────────────
jest.mock("@/lib/bullmq", () => ({
  addEmailJob: jest.fn().mockResolvedValue(undefined),
}));

// ── Sentry mock ──────────────────────────────────────────────────────────────
jest.mock("@/lib/sentry", () => ({
  captureError: jest.fn(),
}));

// ── Import route handler after mocks ─────────────────────────────────────────
import { POST } from "@/app/api/auth/login/route";

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const baseUser = {
  id: "user-1",
  email: "test@example.com",
  passwordHash: "$2b$12$hashed",
  emailVerified: true,
  lockUntil: null,
  loginAttempts: 0,
  twoFactorEnabled: false,
  twoFactorSecret: null,
  displayName: "Test User",
  avatarUrl: null,
  role: "USER",
  username: "testuser",
};

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeviceFindUnique.mockResolvedValue(null);
    mockDeviceFindFirst.mockResolvedValue(null);
    mockDeviceUpsert.mockResolvedValue({
      id: "device-1",
      userId: "user-1",
      deviceHash: "hash",
      userAgent: "jest",
      ipAddress: "203.0.113.0/24",
      lastSeenAt: new Date(),
      createdAt: new Date(),
      revokedAt: null,
    });
  });

  it("returns 400 when email and password are missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Validation failed/i);
  });

  it("returns 400 when only email is provided", async () => {
    const res = await POST(makeRequest({ email: "x@example.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when user is not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await POST(makeRequest({ email: "no@one.com", password: "pass" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 401 when password is wrong", async () => {
    mockFindUnique.mockResolvedValue(baseUser);
    mockCompare.mockResolvedValue(false);
    const res = await POST(makeRequest({ email: baseUser.email, password: "wrong" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid credentials");
  });

  it("returns 403 when email is not verified", async () => {
    mockFindUnique.mockResolvedValue({ ...baseUser, emailVerified: false });
    const res = await POST(makeRequest({ email: baseUser.email, password: "pass" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("EMAIL_NOT_VERIFIED");
  });

  it("returns 423 when account is locked", async () => {
    const lockUntil = new Date(Date.now() + 60_000);
    mockFindUnique.mockResolvedValue({ ...baseUser, lockUntil });
    const res = await POST(makeRequest({ email: baseUser.email, password: "pass" }));
    expect(res.status).toBe(423);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/locked/i);
  });

  it("returns 200 with user data on successful login", async () => {
    mockFindUnique.mockResolvedValue(baseUser);
    mockCompare.mockResolvedValue(true);
    const res = await POST(makeRequest({ email: baseUser.email, password: "correct" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({ id: "user-1", email: baseUser.email });
  });

  it("returns 401 with requiresTwoFactor when 2FA is enabled and no code provided", async () => {
    mockFindUnique.mockResolvedValue({ ...baseUser, twoFactorEnabled: true, twoFactorSecret: "SECRET" });
    mockCompare.mockResolvedValue(true);
    const res = await POST(makeRequest({ email: baseUser.email, password: "correct" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.requiresTwoFactor).toBe(true);
    expect(body.error).toBe("2FA_REQUIRED");
  });
});
