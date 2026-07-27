/**
 * ISR revalidation endpoint — called by the backend after scheduled publishes
 * to immediately invalidate the frontend Next.js page cache.
 *
 * POST /api/revalidate?secret=<REVALIDATE_SECRET>
 * Body: { "path": "/articles/my-slug" }
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid revalidation secret" }, { status: 401 });
  }

  let path = "/";
  try {
    const body = await request.json();
    if (typeof body.path === "string" && body.path.startsWith("/") && body.path.length <= 200) {
      path = body.path;
    }
  } catch {
    // fall through — revalidate root
  }

  revalidatePath(path);
  return NextResponse.json({ revalidated: true, path });
}
