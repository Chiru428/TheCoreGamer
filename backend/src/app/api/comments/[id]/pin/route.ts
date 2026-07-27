import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

    const { id } = await params;
    const comment = await prisma.comment.findUnique({ where: { id }, include: { Article: true } });
    if (!comment) return NextResponse.json(errorResponse("Comment not found"), { status: 404 });

    const isEditorOrAdmin = ["EDITOR", "ADMIN"].includes(session.user.role);
    const isArticleAuthor = comment.Article.authorId === session.user.id;
    if (!isEditorOrAdmin && !isArticleAuthor)
      return NextResponse.json(errorResponse("Forbidden"), { status: 403 });

    await prisma.comment.update({ where: { id }, data: { isPinned: !comment.isPinned } });
    return NextResponse.json(
      successResponse(null, comment.isPinned ? "Comment unpinned" : "Comment pinned")
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
