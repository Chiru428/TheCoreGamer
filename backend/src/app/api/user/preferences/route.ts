import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { rateLimit } from "@/middleware/rateLimit";
import { requireAuth } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { updatePreferencesSchema } from "@/validators";
import { csrfProtection } from "@/middleware/csrfProtection";

/**
 * GET /api/user/preferences
 * Return the authenticated user's content preferences.
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const { session, error } = await requireAuth();
    if (error) return error;

    const prefs = await withRetry(() =>
      prisma.userContentPreference.findUnique({
        where: { userId: session!.user.id },
      })
    );

    return NextResponse.json(
      successResponse(
        prefs ?? { userId: session!.user.id, followedGenres: [], followedPlatforms: [] }
      )
    );
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

/**
 * PUT /api/user/preferences
 * Create or replace the authenticated user's content preferences.
 * Body: { followedGenres: string[], followedPlatforms: string[] }
 */
export async function PUT(request: NextRequest) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { session, error } = await requireAuth();
    if (error) return error;

    const { data, error: bodyError } = await validateBody(request, updatePreferencesSchema);
    if (bodyError) return bodyError;

    const prefs = await withRetry(() =>
      prisma.userContentPreference.upsert({
        where: { userId: session!.user.id },
        create: {
          userId: session!.user.id,
          followedGenres: data.followedGenres ?? [],
          followedPlatforms: data.followedPlatforms ?? [],
        },
        update: {
          followedGenres: data.followedGenres ?? [],
          followedPlatforms: data.followedPlatforms ?? [],
        },
      })
    );

    return NextResponse.json(successResponse(prefs, "Preferences saved"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
