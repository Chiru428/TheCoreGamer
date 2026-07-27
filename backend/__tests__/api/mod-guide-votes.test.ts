/**
 * Tests for POST /api/mod-guides/[slug]/vote and PATCH /api/mod-guides/[slug]/verify
 * Mocks prisma, auth, requireRole, validateBody, csrfProtection, rateLimit, sentry.
 */

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockArticleFindUnique = jest.fn();
const mockVoteFindUnique = jest.fn();
const mockVoteUpsert = jest.fn();
const mockVoteDelete = jest.fn();
const mockGuideUpdate = jest.fn();
const mockGuideFindUniqueOrThrow = jest.fn();
const mockTransaction = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      findUnique: (...args: unknown[]) => mockArticleFindUnique(...args),
    },
    modGuideVote: {
      findUnique: (...args: unknown[]) => mockVoteFindUnique(...args),
      upsert: (...args: unknown[]) => mockVoteUpsert(...args),
      delete: (...args: unknown[]) => mockVoteDelete(...args),
    },
    modGuide: {
      update: (...args: unknown[]) => mockGuideUpdate(...args),
      findUniqueOrThrow: (...args: unknown[]) => mockGuideFindUniqueOrThrow(...args),
    },
    // Route uses the batch form — prisma.$transaction(ops) with an array of
    // already-invoked prisma promises — not the interactive callback form.
    $transaction: (ops: unknown[]) => mockTransaction(ops),
  },
}));

// ── Auth mock ────────────────────────────────────────────────────────────────
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// ── requireRole mock ─────────────────────────────────────────────────────────
const mockRequireRole = jest.fn();
jest.mock("@/middleware/requireRole", () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

// ── validateBody mock ────────────────────────────────────────────────────────
const mockValidateBody = jest.fn();
jest.mock("@/middleware/validateBody", () => ({
  validateBody: (...args: unknown[]) => mockValidateBody(...args),
}));
jest.mock("@/validators", () => ({
  verifyModGuideSchema: {},
}));

// ── csrfProtection / rateLimit / sentry mocks ────────────────────────────────
jest.mock("@/middleware/csrfProtection", () => ({
  csrfProtection: jest.fn().mockReturnValue(null),
}));
jest.mock("@/middleware/rateLimit", () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}));
jest.mock("@/lib/sentry", () => ({ captureError: jest.fn() }));

import { POST as vote } from "@/app/api/mod-guides/[slug]/vote/route";
import { PATCH as verify } from "@/app/api/mod-guides/[slug]/verify/route";
import { NextRequest } from "next/server";

function makeParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function makePost(body: Record<string, unknown>, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/mod-guides/test-guide/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function makePatch(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/mod-guides/test-guide/verify", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const articleWithGuide = { ModGuide: { id: "guide-1" } };
const session = { user: { id: "user-1", role: "USER" } };

// ── POST /api/mod-guides/[slug]/vote ─────────────────────────────────────────
describe("POST /api/mod-guides/[slug]/vote", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects unauthenticated requests with no session id (anonymous voting requires one)", async () => {
    // NOTE: this route has no hard 401 — it supports anonymous voting via an
    // x-session-id header. Without a session AND without that header, it
    // responds 400 "Session ID required for anonymous votes", which is the
    // route's actual equivalent of "not authenticated".
    mockAuth.mockResolvedValue(null);

    const res = await vote(makePost({ value: 1 }), makeParams("test-guide"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Session ID required/);
  });

  it("returns 400 when value is not 1, -1, or 0", async () => {
    mockAuth.mockResolvedValue(session);

    const res = await vote(makePost({ value: 5 }), makeParams("test-guide"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/value must be 1, -1, or 0/);
  });

  it("creates a new vote and increments helpfulCount when value is 1", async () => {
    mockAuth.mockResolvedValue(session);
    mockArticleFindUnique.mockResolvedValue(articleWithGuide);
    mockVoteFindUnique.mockResolvedValue(null); // no existing vote
    mockTransaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));
    mockGuideFindUniqueOrThrow.mockResolvedValue({ helpfulCount: 1, notHelpfulCount: 0 });

    const res = await vote(makePost({ value: 1 }), makeParams("test-guide"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({ helpfulCount: 1, notHelpfulCount: 0, userVote: 1 });

    const updateArgs = mockGuideUpdate.mock.calls[0][0];
    expect(updateArgs.data.helpfulCount).toEqual({ increment: 1 });
    expect(updateArgs.data.notHelpfulCount).toBeUndefined();
  });

  it("creates a new vote and increments notHelpfulCount when value is -1", async () => {
    mockAuth.mockResolvedValue(session);
    mockArticleFindUnique.mockResolvedValue(articleWithGuide);
    mockVoteFindUnique.mockResolvedValue(null); // no existing vote
    mockTransaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));
    mockGuideFindUniqueOrThrow.mockResolvedValue({ helpfulCount: 0, notHelpfulCount: 1 });

    const res = await vote(makePost({ value: -1 }), makeParams("test-guide"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({ helpfulCount: 0, notHelpfulCount: 1, userVote: -1 });

    const updateArgs = mockGuideUpdate.mock.calls[0][0];
    expect(updateArgs.data.notHelpfulCount).toEqual({ increment: 1 });
    expect(updateArgs.data.helpfulCount).toBeUndefined();
  });

  it("upserts the existing vote when the same user votes again with a different value", async () => {
    mockAuth.mockResolvedValue(session);
    mockArticleFindUnique.mockResolvedValue(articleWithGuide);
    mockVoteFindUnique.mockResolvedValue({ value: -1 }); // user previously voted -1, now voting +1
    mockTransaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));
    mockGuideFindUniqueOrThrow.mockResolvedValue({ helpfulCount: 1, notHelpfulCount: 0 });

    const res = await vote(makePost({ value: 1 }), makeParams("test-guide"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({ helpfulCount: 1, notHelpfulCount: 0, userVote: 1 });

    // Vote was upserted (changed) rather than re-created
    expect(mockVoteUpsert).toHaveBeenCalled();
    const upsertArgs = mockVoteUpsert.mock.calls[0][0];
    expect(upsertArgs.update).toEqual({ value: 1 });

    // Switching from -1 to +1 should move both counters
    const updateArgs = mockGuideUpdate.mock.calls[0][0];
    expect(updateArgs.data.helpfulCount).toEqual({ increment: 1 });
    expect(updateArgs.data.notHelpfulCount).toEqual({ increment: -1 });
  });

  it("returns 404 when the guide is not found", async () => {
    mockAuth.mockResolvedValue(session);
    mockArticleFindUnique.mockResolvedValue({ ModGuide: null });

    const res = await vote(makePost({ value: 1 }), makeParams("test-guide"));
    expect(res.status).toBe(404);
  });
});

// ── PATCH /api/mod-guides/[slug]/verify ──────────────────────────────────────
describe("PATCH /api/mod-guides/[slug]/verify", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 403 for non-editor/admin roles", async () => {
    const { NextResponse } = await import("next/server");
    mockRequireRole.mockResolvedValue(
      NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    );

    const res = await verify(makePatch({ version: "1.2.3" }), makeParams("test-guide"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("updates lastVerifiedAt and lastVerifiedVersion correctly", async () => {
    mockRequireRole.mockResolvedValue(null);
    mockAuth.mockResolvedValue({ user: { id: "editor-1", role: "EDITOR" } });
    mockArticleFindUnique.mockResolvedValue({ ModGuide: { id: "guide-1" } });
    mockValidateBody.mockResolvedValue({ data: { version: "1.2.3", notes: "Tested on latest patch" }, error: null });

    const updatedGuide = {
      id: "guide-1",
      lastVerifiedAt: new Date("2026-06-08T00:00:00Z"),
      lastVerifiedVersion: "1.2.3",
      lastVerifiedById: "editor-1",
      compatibilityNotes: "Tested on latest patch",
      User_ModGuide_lastVerifiedByIdToUser: { id: "editor-1", displayName: "Editor", avatarUrl: null },
    };
    mockGuideUpdate.mockResolvedValue(updatedGuide);

    const res = await verify(makePatch({ version: "1.2.3", notes: "Tested on latest patch" }), makeParams("test-guide"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.lastVerifiedVersion).toBe("1.2.3");
    expect(new Date(body.data.lastVerifiedAt).toISOString()).toBe(updatedGuide.lastVerifiedAt.toISOString());
    expect(body.data.lastVerifiedBy).toEqual({ id: "editor-1", displayName: "Editor", avatarUrl: null });

    const updateArgs = mockGuideUpdate.mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id: "guide-1" });
    expect(updateArgs.data.lastVerifiedVersion).toBe("1.2.3");
    expect(updateArgs.data.lastVerifiedById).toBe("editor-1");
    expect(updateArgs.data.lastVerifiedAt).toBeInstanceOf(Date);
  });
});
