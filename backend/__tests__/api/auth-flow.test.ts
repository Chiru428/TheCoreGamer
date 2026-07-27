/**
 * Tests for authentication flows outside of login:
 * register, verify-email, 2fa setup, 2fa verify.
 */

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockFindUnique = jest.fn();
const mockFindFirst = jest.fn();
const mockFindMany = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

// ── bcrypt mock ──────────────────────────────────────────────────────────────
const mockCompare = jest.fn();
const mockHash = jest.fn().mockResolvedValue("hashed-string");
jest.mock("bcrypt", () => ({
  compare: (...args: unknown[]) => mockCompare(...args),
  hash: (...args: unknown[]) => mockHash(...args),
}));

// ── Rate limit & CSRF mock (always pass) ─────────────────────────────────────
jest.mock("@/middleware/rateLimit", () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}));
jest.mock("@/middleware/csrfProtection", () => ({
  csrfProtection: jest.fn().mockReturnValue(null),
}));

// ── Auth mock ────────────────────────────────────────────────────────────────
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// ── Redis mock ────────────────────────────────────────────────────────────────
const mockRedisSet = jest.fn();
const mockRedisGet = jest.fn();
const mockRedisDel = jest.fn();
jest.mock("@/lib/redis", () => ({
  redis: {
    set: (...args: unknown[]) => mockRedisSet(...args),
    get: (...args: unknown[]) => mockRedisGet(...args),
    del: (...args: unknown[]) => mockRedisDel(...args),
  },
}));

// ── TOTP & JWT mock ──────────────────────────────────────────────────────────
jest.mock("@/lib/totp", () => ({
  generateTOTPSecret: jest.fn().mockReturnValue("SECRET"),
  generateTOTPUri: jest.fn().mockReturnValue("otpauth://test"),
  verifyTOTP: jest.fn().mockReturnValue(true),
}));

// ── BullMQ & Sentry mock ─────────────────────────────────────────────────────
jest.mock("@/lib/bullmq", () => ({
  addEmailJob: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/sentry", () => ({ captureError: jest.fn() }));

import { POST as register } from "@/app/api/auth/register/route";
import { POST as verifyEmail } from "@/app/api/auth/verify-email/route";
import { POST as setup2FA } from "@/app/api/auth/2fa/setup/route";
import { POST as verify2FA } from "@/app/api/auth/2fa/verify/route";
import { NextRequest } from "next/server";
import { verifyTOTP } from "@/lib/totp";

// ── Helpers ───────────────────────────────────────────────────────────────────
function makePost(url: string, body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeVerifyEmailPost(token: string): NextRequest {
  return new NextRequest(`http://localhost/api/auth/verify-email?token=${token}`, {
    method: "POST",
  });
}

describe("Auth Flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    const validRegisterBody = {
      email: "new@test.com",
      username: "newuser",
      displayName: "New User",
      password: "Password123!",
    };

    it("returns 409 if user already exists", async () => {
      mockFindFirst.mockResolvedValue({ id: "existing" });
      const res = await register(makePost("http://localhost/api/auth/register", validRegisterBody));
      expect(res.status).toBe(409);
    });

    it("returns 201 and creates user", async () => {
      mockFindFirst.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: "user-new", email: validRegisterBody.email });
      const res = await register(makePost("http://localhost/api/auth/register", validRegisterBody));
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  describe("POST /api/auth/verify-email", () => {
    it("returns 400 if token is missing", async () => {
      const res = await verifyEmail(makeVerifyEmailPost(""));
      expect(res.status).toBe(400);
    });

    it("returns 400 if token is invalid", async () => {
      mockFindMany.mockResolvedValue([{ emailVerificationToken: "hashed" }]);
      mockCompare.mockResolvedValue(false);
      const res = await verifyEmail(makeVerifyEmailPost("bad-token"));
      expect(res.status).toBe(400);
    });

    it("returns 200 and verifies email when token matches", async () => {
      mockFindMany.mockResolvedValue([{ id: "user-1", emailVerificationToken: "hashed" }]);
      mockCompare.mockResolvedValue(true);
      const res = await verifyEmail(makeVerifyEmailPost("good-token"));
      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ emailVerified: true }) })
      );
    });
  });

  describe("POST /api/auth/2fa/setup", () => {
    it("returns 401 if not authenticated", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await setup2FA(makePost("http://localhost/api/auth/2fa/setup"));
      expect(res.status).toBe(401);
    });

    it("returns 400 if 2FA already enabled", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockFindUnique.mockResolvedValue({ twoFactorEnabled: true });
      const res = await setup2FA(makePost("http://localhost/api/auth/2fa/setup"));
      expect(res.status).toBe(400);
    });

    it("generates URI and stores secret in Redis for valid request", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockFindUnique.mockResolvedValue({ twoFactorEnabled: false, email: "test@test.com" });
      const res = await setup2FA(makePost("http://localhost/api/auth/2fa/setup"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.qrCodeUri).toBe("otpauth://test");
      expect(mockRedisSet).toHaveBeenCalledWith("2fa-setup:user-1", "SECRET", { ex: 600 });
    });
  });

  describe("POST /api/auth/2fa/verify", () => {
    it("returns 400 if code is missing", async () => {
      const res = await verify2FA(makePost("http://localhost/api/auth/2fa/verify", { action: "setup" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 if redis secret is missing during setup", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockRedisGet.mockResolvedValue(null);
      const res = await verify2FA(makePost("http://localhost/api/auth/2fa/verify", { action: "setup", code: "123456" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 if code is incorrect", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockRedisGet.mockResolvedValue("SECRET");
      (verifyTOTP as jest.Mock).mockReturnValue(false);
      const res = await verify2FA(makePost("http://localhost/api/auth/2fa/verify", { action: "setup", code: "123456" }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Invalid 2FA code");
    });

    it("returns 200 and enables 2FA on valid setup code", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      mockRedisGet.mockResolvedValue("SECRET");
      (verifyTOTP as jest.Mock).mockReturnValue(true);
      const res = await verify2FA(makePost("http://localhost/api/auth/2fa/verify", { action: "setup", code: "123456" }));
      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ twoFactorEnabled: true }) })
      );
      expect(mockRedisDel).toHaveBeenCalledWith("2fa-setup:user-1");
    });
  });
});
