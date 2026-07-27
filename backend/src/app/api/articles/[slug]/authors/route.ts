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
    const { slug } = await params;

    const article = await prisma.article.findUnique({
      where: { slug },
      include: {
        User_Article_authorIdToUser: {
          select: { id: true, displayName: true, avatarUrl: true, role: true },
        },
        ArticleAuthor: {
          include: {
            User: {
              select: { id: true, displayName: true, avatarUrl: true, role: true },
            },
          },
        },
      },
    });

    if (!article) return NextResponse.json(errorResponse("Article not found"), { status: 404 });

    // Format authors
    const authors = [];

    // Add primary creator as the first primary author if not in join table
    if (!article.ArticleAuthor.some((a) => a.userId === article.authorId && a.isPrimary)) {
      authors.push({
        userId: article.authorId,
        isPrimary: true,
        role: "AUTHOR",
        User: article.User_Article_authorIdToUser,
      });
    }

    authors.push(...article.ArticleAuthor);

    return NextResponse.json(successResponse(authors));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { slug } = await params;
    const { authors } = await request.json(); // Array of { userId: string, isPrimary: boolean, role: string }

    if (!Array.isArray(authors) || authors.length === 0) {
      return NextResponse.json(errorResponse("At least one author is required"), { status: 400 });
    }

    const article = await prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!article) return NextResponse.json(errorResponse("Article not found"), { status: 404 });

    // Update in transaction: delete all existing, insert new ones.
    // And optionally update the Article.authorId if the primary author changed.
    const primaryAuthor = authors.find((a) => a.isPrimary) || authors[0];

    await prisma.$transaction([
      prisma.articleAuthor.deleteMany({ where: { articleId: article.id } }),
      prisma.articleAuthor.createMany({
        data: authors.map((a: any) => ({
          articleId: article.id,
          userId: a.userId,
          isPrimary: Boolean(a.isPrimary),
          role: a.role || "AUTHOR",
        })),
      }),
      prisma.article.update({
        where: { id: article.id },
        data: { authorId: primaryAuthor.userId },
      }),
    ]);

    return NextResponse.json(successResponse(null, "Authors updated successfully"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
