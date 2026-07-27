import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { rejectArticleSchema } from "@/validators";
import { sendArticleRejectionEmail } from "@/lib/resend";
import { auth } from "@/lib/auth";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const session = await auth();
    const { data, error } = await validateBody(request, rejectArticleSchema);
    if (error) return error;

    const { slug } = await params;
    const article = await prisma.article.findUnique({
      where: { slug },
      include: { User_Article_authorIdToUser: true },
    });
    if (!article) return NextResponse.json(errorResponse("Article not found"), { status: 404 });
    if (article.status !== "IN_REVIEW")
      return NextResponse.json(errorResponse("Article is not in review"), { status: 400 });

    await prisma.article.update({
      where: { id: article.id },
      data: { status: "DRAFT", rejectionReason: data.reason, editorId: session!.user.id },
    });

    const { cacheDeletePattern } = await import("@/lib/redis");
    await cacheDeletePattern("posts:list:*");

    sendArticleRejectionEmail(
      article.User_Article_authorIdToUser.email!,
      article.User_Article_authorIdToUser.displayName,
      article.title,
      data.reason,
    ).catch(() => {});

    return NextResponse.json(successResponse(null, "Article rejected"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
