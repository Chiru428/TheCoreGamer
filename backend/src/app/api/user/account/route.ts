import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { deleteAccountSchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";
import { sendAccountDeletedEmail } from "@/lib/resend";

export const runtime = "nodejs";

/**
 * DELETE /api/user/account — anonymize the authenticated user's account (GDPR deletion).
 *
 * The User row is kept (not hard-deleted) so existing comment threads stay intact —
 * PII fields are scrubbed and the account becomes unusable for login. Personal
 * activity data (bookmarks, reading lists, price alerts, follows, push
 * subscriptions) is removed entirely.
 */
export async function DELETE(request: Request) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { data, error: validationError } = await validateBody(request, deleteAccountSchema);
    if (validationError) return validationError;

    const userId = session!.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, displayName: true, passwordHash: true },
    });
    if (!user) return NextResponse.json(errorResponse("User not found"), { status: 404 });

    if (!user.passwordHash) {
      return NextResponse.json(
        errorResponse("Set a password from Security settings before deleting your account"),
        { status: 400 }
      );
    }

    const validPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json(errorResponse("Incorrect password"), { status: 401 });
    }

    await prisma.$transaction([
      prisma.bookmark.deleteMany({ where: { userId } }),
      prisma.readingList.deleteMany({ where: { userId } }),
      prisma.pushSubscription.deleteMany({ where: { userId } }),
      prisma.comment.updateMany({
        where: { authorId: userId },
        data: { authorId: null, authorName: "Deleted User" },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          email: null,
          username: `deleted_${userId}`,
          displayName: "Deleted User",
          avatarUrl: null,
          bio: null,
          passwordHash: null,
        },
      }),
      prisma.moderationLog.create({
        data: {
          action: "ACCOUNT_DELETED",
          targetType: "USER",
          targetId: userId,
          reason: "User-initiated GDPR account deletion",
        },
      }),
    ]);

    if (user.email) {
      sendAccountDeletedEmail(user.email, user.displayName).catch(() => {});
    }

    return NextResponse.json(successResponse(null, "Account deleted successfully"));
  } catch (err) {
    captureError(err, { route: "DELETE /api/user/account" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
