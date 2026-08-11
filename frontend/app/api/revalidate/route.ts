/**
 * ISR revalidation endpoint — called by the backend after scheduled publishes
 * to immediately invalidate the frontend Next.js page cache.
 *
 * POST /api/revalidate?secret=<REVALIDATE_SECRET>
 * Body (single):  { "path": "/articles/my-slug" }
 * Body (batch):   { "paths": ["/games/slug-a", "/games/slug-b"] }
 *
 * The batch format is used by the deals worker to send all changed game paths
 * in one request instead of N separate calls — reduces Render outbound bandwidth.
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid revalidation secret" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // fall through — revalidate root
  }

  // ── Batch mode: { paths: string[] } ──────────────────────────────────────
  if (Array.isArray(body.paths) && body.paths.length > 0) {
    const validPaths = (body.paths as unknown[]).filter(
      (p): p is string =>
        typeof p === "string" && p.startsWith("/") && p.length <= 200
    );
    validPaths.forEach((p) => revalidatePath(p));
    return NextResponse.json({ revalidated: true, paths: validPaths });
  }

  // ── Single mode: { path: string } (backward compatible) ──────────────────
  let path = "/";
  if (typeof body.path === "string" && body.path.startsWith("/") && body.path.length <= 200) {
    path = body.path;
  }

  revalidatePath(path);
  return NextResponse.json({ revalidated: true, path });
}
