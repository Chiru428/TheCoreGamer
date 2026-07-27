import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateBody } from "@/middleware/validateBody";
import { commentVoteSchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";
import { computeSortScore } from "@/lib/commentSort";
import { cacheDelete } from "@/lib/redis";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Concurrent clicks (e.g. a fast like-then-unlike) can both reach the server
// before either's write commits, so both read "no existing vote" and race to
// create one. Rather than serialize every vote behind a lock, retry on the
// unique-constraint conflict — by the time we retry, the other request's row
// exists and we toggle/update against it instead.
async function applyVote(commentId: string, userId: string, value: number, attemptsLeft = 3): Promise<void> {
  const existingVote = await prisma.commentVote.findUnique({
    where: { commentId_userId: { commentId, userId } },
  });

  try {
    if (existingVote) {
      if (existingVote.value === value) {
        await prisma.commentVote.delete({ where: { id: existingVote.id } });
      } else {
        await prisma.commentVote.update({ where: { id: existingVote.id }, data: { value } });
      }
    } else {
      await prisma.commentVote.create({ data: { commentId, userId, value } });
    }
  } catch (err: any) {
    // P2002 = unique constraint violation (lost the race to create), P2025 =
    // record not found (lost the race to update/delete) — both mean the row's
    // state moved under us, so re-read it and apply the vote again.
    if ((err.code === "P2002" || err.code === "P2025") && attemptsLeft > 0) {
      return applyVote(commentId, userId, value, attemptsLeft - 1);
    }
    throw err;
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

    const { data, error } = await validateBody(request, commentVoteSchema);
    if (error) return error;

    const { id } = await params;
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { User: { select: { username: true } } },
    });
    if (!comment) return NextResponse.json(errorResponse("Comment not found"), { status: 404 });

    await applyVote(id, session.user.id, data.value);

    // Recalculate upvotes/downvotes
    const votes = await prisma.commentVote.findMany({ where: { commentId: id } });
    const upvotes = votes.filter((v) => v.value === 1).length;
    const downvotes = votes.filter((v) => v.value === -1).length;
    const sortScore = computeSortScore(upvotes, downvotes, comment.createdAt);
    await prisma.comment.update({ where: { id }, data: { upvotes, downvotes, sortScore } });

    if (comment.authorId && comment.User?.username) {
      await cacheDelete(`profile-summary:${comment.User.username}`).catch(() => {});
    }

    return NextResponse.json(successResponse({ upvotes, downvotes }, "Vote recorded"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
