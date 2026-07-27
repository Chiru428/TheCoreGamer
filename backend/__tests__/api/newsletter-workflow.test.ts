/**
 * Tests for the newsletter confirm and unsubscribe flows.
 */

const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();
const mockUpdateMany = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    newsletterSubscriber: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}));

jest.mock("@/middleware/csrfProtection", () => ({
  csrfProtection: jest.fn().mockReturnValue(null),
}));
jest.mock("@/lib/sentry", () => ({ captureError: jest.fn() }));

import { GET as confirm } from "@/app/api/newsletter/confirm/route";
import { POST as unsubscribe } from "@/app/api/newsletter/unsubscribe/route";
import { NextRequest } from "next/server";

function makeGet(token?: string) {
  const url = `http://localhost/api/newsletter/confirm${token ? `?token=${token}` : ""}`;
  return new NextRequest(url);
}

function makePost(token?: string, body?: { email: string }) {
  const url = `http://localhost/api/newsletter/unsubscribe${token ? `?token=${token}` : ""}`;
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("Newsletter Workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/newsletter/confirm", () => {
    it("returns 400 if token is missing", async () => {
      const res = await confirm(makeGet());
      expect(res.status).toBe(400);
    });

    it("returns 200 for double-confirm idempotency (token still valid)", async () => {
      mockFindFirst.mockResolvedValue({ id: "sub-1", confirmToken: "good-token", confirmed: true });
      const res = await confirm(makeGet("good-token"));
      expect(res.status).toBe(200);
    });

    it("confirms subscription successfully", async () => {
      mockFindFirst.mockResolvedValue({ id: "sub-1", confirmToken: "good-token" });
      const res = await confirm(makeGet("good-token"));
      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ confirmed: true }),
        })
      );
    });
  });

  describe("POST /api/newsletter/unsubscribe", () => {
    it("unsubscribes using token", async () => {
      mockFindFirst.mockResolvedValue({ id: "sub-1", confirmToken: "my-token" });
      const res = await unsubscribe(makePost("my-token"));
      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "sub-1" },
          data: expect.objectContaining({ confirmed: false, unsubscribedAt: expect.any(Date) }),
        })
      );
    });

    it("returns 200 silently even if token not found (idempotent)", async () => {
      mockFindFirst.mockResolvedValue(null);
      const res = await unsubscribe(makePost("unknown-token"));
      expect(res.status).toBe(200);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("unsubscribes using email", async () => {
      const res = await unsubscribe(makePost(undefined, { email: "test@example.com" }));
      expect(res.status).toBe(200);
      expect(mockUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: "test@example.com" },
          data: expect.objectContaining({ confirmed: false, unsubscribedAt: expect.any(Date) }),
        })
      );
    });

    it("returns 400 if neither token nor email provided", async () => {
      const res = await unsubscribe(makePost());
      expect(res.status).toBe(400);
    });
  });
});
