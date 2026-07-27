import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { updateCommentStatusSchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { logModerationAction } from "@/lib/moderation";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";
import { createNotification } from "@/lib/notifications";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { data, error } = await validateBody(request, updateCommentStatusSchema);
    if (error) return error;

    const { id } = await params;
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { User: { select: { username: true } } },
    });
    if (!comment) return NextResponse.json(errorResponse("Comment not found"), { status: 404 });

    const updated = await prisma.comment.update({ where: { id }, data: { status: data.status } });

    if (comment.User?.username) {
      const { cacheDelete } = await import("@/lib/redis");
      await cacheDelete(`profile-summary:${comment.User.username}`);
    }

    if (data.status === "APPROVED" && comment.status !== "APPROVED" && comment.mentionedUserIds.length > 0) {
      const recipients = comment.mentionedUserIds.filter((uid) => uid !== comment.authorId);
      if (recipients.length > 0) {
        const article = await prisma.article.findUnique({
          where: { id: comment.articleId },
          select: { slug: true },
        });
        const mentioner = comment.authorId
          ? await prisma.user.findUnique({ where: { id: comment.authorId }, select: { username: true } })
          : null;
        const mentionerName = mentioner?.username || comment.authorName;
        const href = article ? `/articles/${article.slug}#comment-${comment.id}` : undefined;
        await Promise.all(
          recipients.map((uid) =>
            createNotification(uid, "MENTION", `@${mentionerName} mentioned you`, comment.body, href)
          )
        );
      }
    }

    const { auth } = await import("@/lib/auth");
    const session = await auth();
    const actionMap: Record<string, string> = {
      APPROVED: "APPROVE_COMMENT",
      HIDDEN: "HIDE_COMMENT",
      SPAM: "MARK_SPAM",
    };
    await logModerationAction({
      action: actionMap[data.status] || `UPDATE_COMMENT_${data.status}`,
      targetType: "COMMENT",
      targetId: id,
      moderatorId: session?.user?.id,
      reason: data.reason,
    });

    return NextResponse.json(successResponse(updated, `Comment ${data.status.toLowerCase()}`));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { id } = await params;
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { User: { select: { username: true } } },
    });
    if (!comment) return NextResponse.json(errorResponse("Comment not found"), { status: 404 });

    const { auth } = await import("@/lib/auth");
    const session = await auth();

    try {
      await logModerationAction({
        action: "DELETE_COMMENT",
        targetType: "COMMENT",
        targetId: id,
        moderatorId: session?.user?.id,
      });
    } finally {
      await prisma.comment.delete({ where: { id } });
    }

    if (comment.User?.username) {
      const { cacheDelete } = await import("@/lib/redis");
      await cacheDelete(`profile-summary:${comment.User.username}`);
    }

    return NextResponse.json(successResponse(null, "Comment deleted"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
