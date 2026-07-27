/**
 * Revalidation proxy — forwards to the frontend's /api/revalidate endpoint.
 *
 * The backend renders no pages, so calling revalidatePath() here has no effect.
 * This route exists for backwards compatibility with external webhooks that
 * already point at the backend URL. It proxies the call to the frontend.
 *
 * POST /api/revalidate?secret=<REVALIDATE_SECRET>
 * Body: { "path": "/articles/my-slug" }
 */
import { NextRequest, NextResponse } from "next/server";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get("secret");
    if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
      return NextResponse.json(errorResponse("Invalid revalidation secret"), { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const path = typeof body.path === "string" ? body.path : "/";

    // Forward to the frontend which actually renders the pages
    const res = await fetch(
      `${FRONTEND_URL}/api/revalidate?secret=${encodeURIComponent(process.env.REVALIDATE_SECRET)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        errorResponse(`Frontend revalidation failed: ${res.status}`),
        { status: 502 }
      );
    }

    return NextResponse.json(successResponse({ revalidated: true, path }, "Revalidated via frontend"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
