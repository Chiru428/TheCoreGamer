import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { z } from "zod";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";

export const runtime = "nodejs";

const updatePrefsSchema = z.object({
  newArticlesInCategories: z.boolean().optional(),
  commentReplies: z.boolean().optional(),
  newsletter: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
});

export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: session!.user.id },
      create: { userId: session!.user.id },
      update: {},
    });

    return NextResponse.json(successResponse(prefs));
  } catch (err) {
    captureError(err, { route: "GET /api/user/notifications" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function PUT(request: Request) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { data, error: validationError } = await validateBody(request, updatePrefsSchema);
    if (validationError) return validationError;

    const updated = await prisma.notificationPreference.upsert({
      where: { userId: session!.user.id },
      create: { userId: session!.user.id, ...data },
      update: data,
    });

    return NextResponse.json(successResponse(updated, "Preferences updated"));
  } catch (err) {
    captureError(err, { route: "PUT /api/user/notifications" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
