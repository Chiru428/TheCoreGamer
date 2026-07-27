import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { requireAuth } from "@/middleware/requireRole";
import { validateBody } from "@/middleware/validateBody";
import { csrfProtection } from "@/middleware/csrfProtection";
import { rateLimit } from "@/middleware/rateLimit";
import { generateUniqueListSlug } from "@/lib/slug";
import { z } from "zod";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export const runtime = "nodejs";

const createListSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  isPublic: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const { session, error } = await requireAuth();
    if (error) return error;

    const lists = await withRetry(() =>
      prisma.readingList.findMany({
        where: { userId: session!.user.id },
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { Items: true } },
        },
      })
    );

    const normalized = lists.map((list) => {
      const { _count, ...rest } = list;
      return { ...rest, itemCount: _count.Items };
    });

    return NextResponse.json(successResponse(normalized));
  } catch (err) {
    captureError(err, { route: "GET /api/user/lists" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { session, error } = await requireAuth();
    if (error) return error;

    const { data, error: validationError } = await validateBody(request, createListSchema);
    if (validationError) return validationError;

    const slug = await generateUniqueListSlug(session!.user.id, data.name);

    const list = await withRetry(() =>
      prisma.readingList.create({
        data: {
          userId: session!.user.id,
          name: data.name,
          description: data.description,
          isPublic: data.isPublic ?? false,
          slug,
        },
      })
    );

    return NextResponse.json(successResponse({ ...list, itemCount: 0 }, "List created"), { status: 201 });
  } catch (err) {
    captureError(err, { route: "POST /api/user/lists" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
