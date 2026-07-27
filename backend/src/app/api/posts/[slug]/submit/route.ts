import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEditorNotificationEmail } from "@/lib/resend";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// POST /api/posts/[slug]/submit — submit for review
export async function POST(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

    const { slug } = await params;
    const article = await prisma.article.findUnique({
      where: { slug },
      include: { User_Article_authorIdToUser: true },
    });
    if (!article) return NextResponse.json(errorResponse("Article not found"), { status: 404 });
    if (article.authorId !== session.user.id)
      return NextResponse.json(errorResponse("Forbidden"), { status: 403 });
    if (article.status !== "DRAFT")
      return NextResponse.json(errorResponse("Only drafts can be submitted"), { status: 400 });

    await prisma.article.update({ where: { id: article.id }, data: { status: "IN_REVIEW" } });

    const { cacheDeletePattern } = await import("@/lib/redis");
    await cacheDeletePattern("posts:list:*");

    // Notify editors
    const editors = await prisma.user.findMany({
      where: { role: { in: ["EDITOR", "ADMIN"] } },
      select: { email: true },
    });
    if (editors.length > 0) {
      const editorEmails = editors.map((e) => e.email).filter(Boolean) as string[];
      sendEditorNotificationEmail(
        editorEmails,
        article.title,
        article.User_Article_authorIdToUser.displayName,
      ).catch(() => {});
    }

    return NextResponse.json(successResponse(null, "Article submitted for review"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
