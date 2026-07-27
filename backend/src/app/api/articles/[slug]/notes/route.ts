import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { csrfProtection } from "@/middleware/csrfProtection";
import { successResponse, errorResponse } from "@/types";
import { captureError } from "@/lib/sentry";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const roleCheck = await requireRole(["AUTHOR", "EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { slug } = await params;
    const article = await prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!article) return NextResponse.json(errorResponse("Article not found"), { status: 404 });

    const notes = await prisma.editorNote.findMany({
      where: { articleId: article.id },
      include: {
        User: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(successResponse(notes));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const roleError = await requireRole(["AUTHOR", "EDITOR", "ADMIN"], request);
    if (roleError) return roleError;

    const { auth } = await import("@/lib/auth");
    const session = await auth();

    const { slug } = await params;
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json(errorResponse("Note content is required"), { status: 400 });
    }

    const article = await prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!article) return NextResponse.json(errorResponse("Article not found"), { status: 404 });

    const note = await prisma.editorNote.create({
      data: {
        content: content.trim(),
        articleId: article.id,
        authorId: session!.user.id,
      },
      include: {
        User: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json(successResponse(note, "Note added"), { status: 201 });
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
