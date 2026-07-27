import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  if (path) {
    revalidatePath(path);
    revalidatePath(path, "page");
    revalidatePath(path, "layout");
    return NextResponse.json({ success: true, revalidated: path });
  }
  return NextResponse.json({ success: false });
}
