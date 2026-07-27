import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { captureError } from "@/lib/sentry";
import { csrfProtection } from "@/middleware/csrfProtection";

export async function POST(request: Request) {
  try {
    const csrfError = csrfProtection(request);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // NextAuth v5 manages token rotation internally via JWT strategy.
    // This endpoint confirms the session is still valid.
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role,
        },
      },
    });
  } catch (err) {
    captureError(err, { route: "POST /api/auth/refresh" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
