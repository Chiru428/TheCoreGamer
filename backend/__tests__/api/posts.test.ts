/**
 * Tests for GET and POST /api/posts
 * Mocks prisma, auth, requireRole/requireAuth, and redis.
 */

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockCreate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

// ── Auth mock ────────────────────────────────────────────────────────────────
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// ── requireAuth / requireRole mock ───────────────────────────────────────────
const mockRequireAuth = jest.fn();
const mockRequireRole = jest.fn();
jest.mock("@/middleware/requireRole", () => ({
  requireAuth: () => mockRequireAuth(),
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

// ── Redis mock (always miss so DB is hit) ─────────────────────────────────────
jest.mock("@/lib/redis", () => ({
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  cacheDeletePattern: jest.fn().mockResolvedValue(undefined),
}));

// ── Rate limit mock (always pass) ────────────────────────────────────────────
jest.mock("@/middleware/rateLimit", () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}));

// ── Slug and sentry mocks ─────────────────────────────────────────────────────
jest.mock("@/lib/slug", () => ({
  generateUniqueSlug: jest.fn().mockResolvedValue("test-article"),
}));
jest.mock("@/lib/sentry", () => ({ captureError: jest.fn().mockImplementation((err) => console.error(err)) }));
jest.mock("@/lib/withRetry", () => ({
  withRetry: (fn: () => unknown) => fn(),
}));
jest.mock("@/lib/bullmq", () => ({ addEmailJob: jest.fn() }));

import { GET, POST } from "@/app/api/posts/route";
import { NextRequest } from "next/server";

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/posts");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

function makePost(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const publishedArticle = {
  id: "art-1",
  title: "Test Article",
  slug: "test-article",
  status: "PUBLISHED",
  contentType: "NEWS",
  createdAt: new Date(),
  updatedAt: new Date(),
  publishedAt: new Date(),
  viewCount: BigInt(0),
  featured: false,
  isBreaking: false,
  excerpt: null,
  featuredImageUrl: null,
  authorId: "user-1",
  editorId: null,
  seoTitle: null,
  seoDescription: null,
  focusKeyword: null,
  scheduledAt: null,
  searchVector: null,
  autosaveContent: null,
  autosavedAt: null,
  rejectionReason: null,
  content: { type: "doc", content: [] },
  User_Article_authorIdToUser: { id: "user-1", displayName: "Author", avatarUrl: null, username: "author" },
  User_Article_editorIdToUser: null,
  ArticleTag: [],
  GameReview: null,
  ModGuide: null,
  Game: [],
  _count: { Comment: 0, ArticleReaction: 0 },
};

// ── GET Tests ─────────────────────────────────────────────────────────────────
describe("GET /api/posts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns only PUBLISHED articles for unauthenticated users", async () => {
    // No session — unauthenticated
    mockAuth.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([publishedArticle]);
    mockCount.mockResolvedValue(1);

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Confirm prisma was called with status: "PUBLISHED"
    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.status).toBe("PUBLISHED");
  });

  it("allows EDITOR to request non-published statuses", async () => {
    mockAuth.mockResolvedValue({ user: { role: "EDITOR" } });
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await GET(makeGet({ status: "DRAFT" }));

    const callArgs = mockFindMany.mock.calls[0][0];
    // Status filter from query should pass through for privileged users
    expect(callArgs.where.status).toBe("DRAFT");
  });
});

// ── POST Tests ────────────────────────────────────────────────────────────────
describe("POST /api/posts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validBody = {
    title: "New Article",
    content: { type: "doc", content: [] },
    contentType: "NEWS",
  };

  it("returns 403 for USER role", async () => {
    mockRequireAuth.mockResolvedValue({
      session: { user: { id: "user-1", role: "USER" } },
      error: null,
    });

    const res = await POST(makePost(validBody));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 201 for AUTHOR role", async () => {
    mockRequireAuth.mockResolvedValue({
      session: { user: { id: "author-1", role: "AUTHOR" } },
      error: null,
    });
    mockCreate.mockResolvedValue({ ...publishedArticle, authorId: "author-1", status: "DRAFT" });

    const res = await POST(makePost(validBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 401 when not authenticated", async () => {
    const { NextResponse } = await import("next/server");
    mockRequireAuth.mockResolvedValue({
      session: null,
      error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    });

    const res = await POST(makePost(validBody));
    expect(res.status).toBe(401);
  });
});
