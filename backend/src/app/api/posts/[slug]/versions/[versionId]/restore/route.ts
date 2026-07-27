import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";

interface RouteParams {
  params: Promise<{ slug: string; versionId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const session = await auth();
    const { slug, versionId } = await params;
    const article = await prisma.article.findUnique({ where: { slug } });
    if (!article) return NextResponse.json(errorResponse("Article not found"), { status: 404 });

    const version = await prisma.articleVersion.findUnique({ where: { id: versionId } });
    if (!version || version.articleId !== article.id) {
      return NextResponse.json(errorResponse("Version not found"), { status: 404 });
    }

    // Create snapshot of current state first
    const versionCount = await prisma.articleVersion.count({ where: { articleId: article.id } });
    await prisma.articleVersion.create({
      data: {
        articleId: article.id,
        versionNumber: versionCount + 1,
        title: article.title,
        content: article.content as object,
        editorId: session!.user.id,
      },
    });

    // Restore version
    await prisma.article.update({
      where: { id: article.id },
      data: { title: version.title, content: version.content as object },
    });

    return NextResponse.json(successResponse(null, `Restored to version ${version.versionNumber}`));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
