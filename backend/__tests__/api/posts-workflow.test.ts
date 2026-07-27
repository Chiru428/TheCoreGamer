/**
 * Tests for the article state machine transitions:
 * submit, approve, reject, publish, unpublish, schedule.
 */

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([{ email: "editor@test.com" }]),
    },
  },
}));

// ── Auth & requireRole mock ──────────────────────────────────────────────────
const mockAuth = jest.fn();
const mockRequireRole = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));
jest.mock("@/middleware/requireRole", () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

// ── BullMQ mock ───────────────────────────────────────────────────────────────
jest.mock("@/lib/bullmq", () => ({
  addEmailJob: jest.fn().mockResolvedValue(undefined),
  addSearchIndexJob: jest.fn().mockResolvedValue(undefined),
  addPushJob: jest.fn().mockResolvedValue(undefined),
}));

// ── csrfProtection mock (always pass) ────────────────────────────────────────
jest.mock("@/middleware/csrfProtection", () => ({
  csrfProtection: jest.fn().mockReturnValue(null),
}));

// ── Redis & Sentry mocks ─────────────────────────────────────────────────────
jest.mock("@/lib/redis", () => ({
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  cacheDeletePattern: jest.fn().mockResolvedValue(undefined),
  cacheDelete: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/sentry", () => ({ captureError: jest.fn() }));

import { POST as submit } from "@/app/api/posts/[slug]/submit/route";
import { POST as approve } from "@/app/api/posts/[slug]/approve/route";
import { POST as reject } from "@/app/api/posts/[slug]/reject/route";
import { POST as publish } from "@/app/api/posts/[slug]/publish/route";
import { POST as unpublish } from "@/app/api/posts/[slug]/unpublish/route";
import { POST as schedule } from "@/app/api/posts/[slug]/schedule/route";

function makePost(body: Record<string, unknown> = {}): Request {
  return new Request("http://localhost/api/posts/test-slug/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ slug: "test-slug" });
const baseArticle = {
  id: "art-1",
  slug: "test-slug",
  authorId: "author-1",
  status: "DRAFT",
  title: "Test Article",
  User_Article_authorIdToUser: { displayName: "Author", email: "author@test.com" },
};

describe("Article Workflow State Machine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "author-1", role: "AUTHOR" } });
    mockRequireRole.mockResolvedValue(null);
  });

  describe("Submit (DRAFT -> IN_REVIEW)", () => {
    it("returns 403 if user is not the author", async () => {
      mockAuth.mockResolvedValue({ user: { id: "different-user", role: "AUTHOR" } });
      mockFindUnique.mockResolvedValue(baseArticle);
      const res = await submit(makePost(), { params });
      expect(res.status).toBe(403);
    });

    it("returns 400 if article is not DRAFT", async () => {
      mockFindUnique.mockResolvedValue({ ...baseArticle, status: "PUBLISHED" });
      const res = await submit(makePost(), { params });
      expect(res.status).toBe(400);
    });

    it("transitions to IN_REVIEW successfully", async () => {
      mockFindUnique.mockResolvedValue(baseArticle);
      const res = await submit(makePost(), { params });
      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: "IN_REVIEW" } })
      );
    });
  });

  describe("Approve (IN_REVIEW -> PUBLISHED)", () => {
    it("requires EDITOR/ADMIN role", async () => {
      const { NextResponse } = await import("next/server");
      mockRequireRole.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
      const res = await approve(makePost(), { params });
      expect(res.status).toBe(403);
    });

    it("returns 400 if article is not IN_REVIEW", async () => {
      mockFindUnique.mockResolvedValue(baseArticle); // status is DRAFT
      const res = await approve(makePost(), { params });
      expect(res.status).toBe(400);
    });

    it("transitions to PUBLISHED successfully", async () => {
      mockAuth.mockResolvedValue({ user: { id: "editor-1", role: "EDITOR" } });
      mockFindUnique.mockResolvedValue({ ...baseArticle, status: "IN_REVIEW" });
      const res = await approve(makePost(), { params });
      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "PUBLISHED", editorId: "editor-1" }),
        })
      );
    });
  });

  describe("Reject (IN_REVIEW -> DRAFT)", () => {
    it("returns 400 if article is not IN_REVIEW", async () => {
      mockFindUnique.mockResolvedValue(baseArticle); // status is DRAFT
      const res = await reject(makePost({ reason: "Needs work" }), { params });
      expect(res.status).toBe(400);
    });

    it("transitions to DRAFT successfully with rejection reason", async () => {
      mockAuth.mockResolvedValue({ user: { id: "editor-1", role: "EDITOR" } });
      mockFindUnique.mockResolvedValue({ ...baseArticle, status: "IN_REVIEW" });
      const res = await reject(makePost({ reason: "Needs work" }), { params });
      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "DRAFT", rejectionReason: "Needs work" }),
        })
      );
    });
  });

  describe("Publish", () => {
    it("sets status to PUBLISHED", async () => {
      mockAuth.mockResolvedValue({ user: { id: "editor-1", role: "EDITOR" } });
      mockFindUnique.mockResolvedValue(baseArticle);
      const res = await publish(makePost(), { params });
      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "PUBLISHED" }),
        })
      );
    });
  });

  describe("Unpublish", () => {
    it("returns 400 if not PUBLISHED", async () => {
      mockFindUnique.mockResolvedValue(baseArticle);
      const res = await unpublish(makePost(), { params });
      expect(res.status).toBe(400);
    });

    it("sets status back to DRAFT", async () => {
      mockFindUnique.mockResolvedValue({ ...baseArticle, status: "PUBLISHED" });
      const res = await unpublish(makePost(), { params });
      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "DRAFT" }),
        })
      );
    });
  });

  describe("Schedule", () => {
    it("sets scheduledAt successfully", async () => {
      mockAuth.mockResolvedValue({ user: { id: "editor-1", role: "EDITOR" } });
      mockFindUnique.mockResolvedValue(baseArticle);
      const res = await schedule(makePost({ scheduledAt: new Date(Date.now() + 86400000).toISOString() }), { params });
      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scheduledAt: expect.any(Date) }),
        })
      );
    });
  });
});
