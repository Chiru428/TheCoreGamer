/**
 * Tests for POST /api/newsletter/subscribe
 * Mocks prisma, bullmq, validateBody, rateLimit, sentry.
 */

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockCreate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    newsletterSubscriber: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

// ── BullMQ mock ───────────────────────────────────────────────────────────────
const mockAddEmailJob = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/bullmq", () => ({
  addEmailJob: (...args: unknown[]) => mockAddEmailJob(...args),
}));

// ── validateBody mock ─────────────────────────────────────────────────────────
const mockValidateBody = jest.fn();
jest.mock("@/middleware/validateBody", () => ({
  validateBody: (...args: unknown[]) => mockValidateBody(...args),
}));

// ── Rate limit mock (always pass) ────────────────────────────────────────────
jest.mock("@/middleware/rateLimit", () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}));

// ── Sentry mock ───────────────────────────────────────────────────────────────
jest.mock("@/lib/sentry", () => ({ captureError: jest.fn() }));

import { POST } from "@/app/api/newsletter/subscribe/route";
import { NextResponse } from "next/server";
import { rateLimit } from "@/middleware/rateLimit";

// ── Helpers ───────────────────────────────────────────────────────────────────
function makePost(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/newsletter/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validBodyResult(email = "user@example.com") {
  return { data: { email }, error: null };
}

function invalidBodyResult() {
  return {
    data: null,
    error: NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 }),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("POST /api/newsletter/subscribe", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimit as jest.Mock).mockResolvedValue(null);
  });

  it("returns 201 and queues confirmation email for new subscriber", async () => {
    mockValidateBody.mockResolvedValue(validBodyResult("new@example.com"));
    mockFindUnique.mockResolvedValue(null); // no existing subscriber
    mockCreate.mockResolvedValue({ id: "sub-1", email: "new@example.com", confirmed: false });

    const res = await POST(makePost({ email: "new@example.com" }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockAddEmailJob).toHaveBeenCalledTimes(1);
    expect(mockAddEmailJob).toHaveBeenCalledWith(
      expect.objectContaining({ type: "newsletter-confirm", to: "new@example.com" })
    );
  });

  it("returns 200 'Already subscribed' for confirmed existing email", async () => {
    mockValidateBody.mockResolvedValue(validBodyResult("confirmed@example.com"));
    mockFindUnique.mockResolvedValue({
      id: "sub-2",
      email: "confirmed@example.com",
      confirmed: true,
    });

    const res = await POST(makePost({ email: "confirmed@example.com" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe("Already subscribed");
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockAddEmailJob).not.toHaveBeenCalled();
  });

  it("re-sends confirmation for unconfirmed existing subscriber", async () => {
    mockValidateBody.mockResolvedValue(validBodyResult("pending@example.com"));
    mockFindUnique.mockResolvedValue({
      id: "sub-3",
      email: "pending@example.com",
      confirmed: false,
    });
    mockUpdate.mockResolvedValue({ id: "sub-3" });

    const res = await POST(makePost({ email: "pending@example.com" }));

    expect(res.status).toBe(201);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockAddEmailJob).toHaveBeenCalledTimes(1);
    expect(mockAddEmailJob).toHaveBeenCalledWith(
      expect.objectContaining({ type: "newsletter-confirm", to: "pending@example.com" })
    );
  });

  it("returns 400 for invalid email format", async () => {
    mockValidateBody.mockResolvedValue(invalidBodyResult());

    const res = await POST(makePost({ email: "not-an-email" }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockAddEmailJob).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limit is exceeded", async () => {
    (rateLimit as jest.Mock).mockResolvedValueOnce(
      NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 })
    );

    const res = await POST(makePost({ email: "user@example.com" }));

    expect(res.status).toBe(429);
    expect(mockValidateBody).not.toHaveBeenCalled();
  });
});
