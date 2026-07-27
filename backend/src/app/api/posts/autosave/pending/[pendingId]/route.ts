import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { rateLimit } from "@/middleware/rateLimit";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";

interface RouteParams {
  params: Promise<{ pendingId: string }>;
}

const AUTOSAVE_TTL = 7 * 24 * 3600; // 7 days

// GET /api/posts/autosave/pending/[pendingId]
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { pendingId } = await params;
    const key = `autosave:pending:${pendingId}`;

    const data = await redis.get(key);
    if (!data) {
      return NextResponse.json(errorResponse("No pending autosave found"), { status: 404 });
    }

    return NextResponse.json(successResponse(data));
  } catch (err) {
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

// PATCH /api/posts/autosave/pending/[pendingId]
export async function PATCH(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { pendingId } = await params;
    const key = `autosave:pending:${pendingId}`;

    const { content, savedAt } = await request.json();

    if (!content) {
      return NextResponse.json(errorResponse("Content required"), { status: 400 });
    }

    await redis.set(
      key,
      {
        autosaveContent: content,
        autosavedAt: savedAt ? new Date(savedAt).toISOString() : new Date().toISOString(),
      },
      { ex: AUTOSAVE_TTL }
    );

    return NextResponse.json(successResponse({ success: true }));
  } catch (err) {
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

// DELETE /api/posts/autosave/pending/[pendingId]
export async function DELETE(request: Request, { params }: RouteParams) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const { pendingId } = await params;
    const key = `autosave:pending:${pendingId}`;

    await redis.del(key);

    return NextResponse.json(successResponse({ success: true }));
  } catch (err) {
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
