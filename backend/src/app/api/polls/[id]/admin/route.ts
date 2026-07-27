import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/polls/[id]/admin
 * Full breakdown of poll votes per option with timestamps.
 * Requires EDITOR or ADMIN role.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { id } = await params;

    const [poll, inlineArticles] = await withRetry(() =>
      Promise.all([
        prisma.poll.findUnique({
          where: { id },
          include: {
            Options: { orderBy: { id: "asc" } },
            Creator: {
              select: { id: true, username: true, displayName: true },
            },
            Article: { select: { title: true, slug: true, contentType: true } },
            Votes: {
              where: { customText: { not: null } },
              select: { optionId: true, customText: true, createdAt: true, User: { select: { username: true } } },
              orderBy: { createdAt: "desc" },
            }
          },
        }),
        // Find articles that embed this poll inline in their content JSON
        prisma.article.findMany({
          where: { content: { path: [], string_contains: id } },
          select: { id: true, title: true, slug: true, contentType: true },
          take: 10,
        }),
      ])
    );

    if (!poll) {
      return NextResponse.json(errorResponse("Poll not found"), { status: 404 });
    }

    const totalVotes = poll.voterCount;
    // Percentages are share-of-votes-cast (sums to 100%), not share-of-voters —
    // on a multi-select poll one voter can be counted in several options' totals.
    const totalOptionVotes = poll.Options.reduce((sum, o) => sum + o.voteCount, 0);

    const optionsWithStats = poll.Options.map((opt) => ({
      id: opt.id,
      text: opt.text,
      voteCount: opt.voteCount,
      percentage: totalOptionVotes > 0 ? Math.round((opt.voteCount / totalOptionVotes) * 100) : 0,
    }));

    return NextResponse.json(
      successResponse({
        ...poll,
        Options: optionsWithStats,
        totalVotes,
        inlineArticles,
        customTextVotes: poll.Votes,
      })
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
