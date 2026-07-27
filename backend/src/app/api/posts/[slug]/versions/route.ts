import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });

    const { slug } = await params;
    const article = await prisma.article.findUnique({ where: { slug } });
    if (!article) return NextResponse.json(errorResponse("Article not found"), { status: 404 });

    const isOwner = article.authorId === session.user.id;
    const isEditorOrAdmin = ["EDITOR", "ADMIN"].includes(session.user.role);
    if (!isOwner && !isEditorOrAdmin)
      return NextResponse.json(errorResponse("Forbidden"), { status: 403 });

    const versions = await prisma.articleVersion.findMany({
      where: { articleId: article.id },
      orderBy: { versionNumber: "desc" },
      include: { User: { select: { id: true, displayName: true } } },
    });

    const mappedVersions = versions.map((v: any) => {
      const { User, ...rest } = v;
      return { ...rest, editor: User };
    });

    return NextResponse.json(successResponse(mappedVersions));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
