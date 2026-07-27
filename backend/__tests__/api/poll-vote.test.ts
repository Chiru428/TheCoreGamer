/**
 * Tests for POST /api/polls/[id]/vote
 * Covers single-select voting, multi-select voting (allowMultiple), and the
 * guardrails around both (duplicate votes, invalid options, closed/expired polls).
 */

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockPollFindUnique = jest.fn();
const mockVoteFindFirst = jest.fn();
const mockVoteCreateMany = jest.fn();
const mockOptionUpdateMany = jest.fn();
const mockPollUpdate = jest.fn();
const mockTransaction = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    poll: {
      findUnique: (...args: unknown[]) => mockPollFindUnique(...args),
      update: (...args: unknown[]) => mockPollUpdate(...args),
    },
    pollVote: {
      findFirst: (...args: unknown[]) => mockVoteFindFirst(...args),
      createMany: (...args: unknown[]) => mockVoteCreateMany(...args),
    },
    pollOption: {
      updateMany: (...args: unknown[]) => mockOptionUpdateMany(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

// ── Auth mock ────────────────────────────────────────────────────────────────
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// ── validateBody mock — passes through the parsed body untouched ────────────
jest.mock("@/middleware/validateBody", () => ({
  validateBody: async (request: Request) => ({ data: await request.json(), error: null }),
}));

// ── csrfProtection / rateLimit / sentry / redis mocks ────────────────────────
jest.mock("@/middleware/csrfProtection", () => ({
  csrfProtection: jest.fn().mockReturnValue(null),
}));
jest.mock("@/middleware/rateLimit", () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}));
jest.mock("@/lib/sentry", () => ({ captureError: jest.fn() }));
jest.mock("@/lib/redis", () => ({ cacheDeletePattern: jest.fn().mockResolvedValue(undefined) }));

import { POST as vote } from "@/app/api/polls/[id]/vote/route";
import { NextRequest } from "next/server";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makePost(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/polls/poll-1/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const singleSelectPoll = {
  id: "poll-1",
  isActive: true,
  expiresAt: null,
  allowMultiple: false,
  Options: [{ id: "opt-a" }, { id: "opt-b" }],
};

const multiSelectPoll = { ...singleSelectPoll, allowMultiple: true };

describe("POST /api/polls/[id]/vote", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockTransaction.mockImplementation((ops: unknown[]) => Promise.all(ops));
  });

  it("casts a single-option vote and increments voterCount once", async () => {
    mockPollFindUnique
      .mockResolvedValueOnce(singleSelectPoll) // existence check
      .mockResolvedValueOnce({ ...singleSelectPoll, voterCount: 1, Options: [] }); // post-vote refetch
    mockVoteFindFirst.mockResolvedValue(null);

    const res = await vote(makePost({ optionIds: ["opt-a"] }), makeParams("poll-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.userVotes).toEqual(["opt-a"]);
    expect(body.data.totalVotes).toBe(1);

    expect(mockVoteCreateMany).toHaveBeenCalledWith({
      data: [{ pollId: "poll-1", optionId: "opt-a", userId: "user-1", sessionId: undefined }],
    });
    expect(mockPollUpdate).toHaveBeenCalledWith({
      where: { id: "poll-1" },
      data: { voterCount: { increment: 1 } },
    });
  });

  it("rejects more than one optionId on a single-select poll", async () => {
    mockPollFindUnique.mockResolvedValueOnce(singleSelectPoll);

    const res = await vote(makePost({ optionIds: ["opt-a", "opt-b"] }), makeParams("poll-1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/only allows one selection/);
    expect(mockVoteCreateMany).not.toHaveBeenCalled();
  });

  it("casts a multi-option vote on an allowMultiple poll as one voter action", async () => {
    mockPollFindUnique
      .mockResolvedValueOnce(multiSelectPoll)
      .mockResolvedValueOnce({ ...multiSelectPoll, voterCount: 1, Options: [] });
    mockVoteFindFirst.mockResolvedValue(null);

    const res = await vote(makePost({ optionIds: ["opt-a", "opt-b"] }), makeParams("poll-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.userVotes).toEqual(["opt-a", "opt-b"]);

    // One PollVote row per selected option, but only one voterCount increment
    expect(mockVoteCreateMany).toHaveBeenCalledWith({
      data: [
        { pollId: "poll-1", optionId: "opt-a", userId: "user-1", sessionId: undefined },
        { pollId: "poll-1", optionId: "opt-b", userId: "user-1", sessionId: undefined },
      ],
    });
    expect(mockOptionUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["opt-a", "opt-b"] } },
      data: { voteCount: { increment: 1 } },
    });
    expect(mockPollUpdate).toHaveBeenCalledTimes(1);
  });

  it("rejects an optionId that doesn't belong to the poll", async () => {
    mockPollFindUnique.mockResolvedValueOnce(multiSelectPoll);

    const res = await vote(makePost({ optionIds: ["opt-bogus"] }), makeParams("poll-1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Option not found/);
  });

  it("rejects voting twice on the same poll", async () => {
    mockPollFindUnique.mockResolvedValueOnce(singleSelectPoll);
    mockVoteFindFirst.mockResolvedValue({ id: "existing-vote" });

    const res = await vote(makePost({ optionIds: ["opt-a"] }), makeParams("poll-1"));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already voted/);
  });

  it("rejects voting on a closed poll", async () => {
    mockPollFindUnique.mockResolvedValueOnce({ ...singleSelectPoll, isActive: false });

    const res = await vote(makePost({ optionIds: ["opt-a"] }), makeParams("poll-1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/closed/);
  });

  it("returns 404 when the poll doesn't exist", async () => {
    mockPollFindUnique.mockResolvedValueOnce(null);

    const res = await vote(makePost({ optionIds: ["opt-a"] }), makeParams("poll-1"));
    expect(res.status).toBe(404);
  });

  it("allows anonymous votes via sessionId when there is no auth session", async () => {
    mockAuth.mockResolvedValue(null);
    mockPollFindUnique
      .mockResolvedValueOnce(singleSelectPoll)
      .mockResolvedValueOnce({ ...singleSelectPoll, voterCount: 1, Options: [] });
    mockVoteFindFirst.mockResolvedValue(null);

    const res = await vote(
      makePost({ optionIds: ["opt-a"], sessionId: "anon-session-1" }),
      makeParams("poll-1")
    );
    expect(res.status).toBe(200);
    expect(mockVoteCreateMany).toHaveBeenCalledWith({
      data: [{ pollId: "poll-1", optionId: "opt-a", userId: undefined, sessionId: "anon-session-1" }],
    });
  });
});
