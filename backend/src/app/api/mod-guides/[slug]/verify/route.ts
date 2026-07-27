import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireRole } from "@/middleware/requireRole";
import { rateLimit } from "@/middleware/rateLimit";
import { validateBody } from "@/middleware/validateBody";
import { verifyModGuideSchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/** PATCH /api/mod-guides/[slug]/verify — mark a guide as verified against a game version */
export async function PATCH(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["EDITOR", "ADMIN"], request);
    if (roleCheck) return roleCheck;

    const session = await auth();
    const userId = session?.user?.id;

    const { slug } = await params;
    const article = await prisma.article.findUnique({
      where: { slug },
      include: { ModGuide: true },
    });
    if (!article || !article.ModGuide)
      return NextResponse.json(errorResponse("Guide not found"), { status: 404 });

    const { data, error } = await validateBody(request, verifyModGuideSchema);
    if (error) return error;

    const updated = await prisma.modGuide.update({
      where: { id: article.ModGuide.id },
      data: {
        lastVerifiedAt: new Date(),
        lastVerifiedVersion: data.version,
        lastVerifiedById: userId,
        ...(data.notes !== undefined && { compatibilityNotes: data.notes }),
      },
      include: {
        User_ModGuide_lastVerifiedByIdToUser: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });

    const { User_ModGuide_lastVerifiedByIdToUser, ...rest } = updated;
    return NextResponse.json(
      successResponse({ ...rest, lastVerifiedBy: User_ModGuide_lastVerifiedByIdToUser || null })
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
