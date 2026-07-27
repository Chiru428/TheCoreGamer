import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { csrfProtection } from "@/middleware/csrfProtection";
import { sendWelcomeEmail } from "@/lib/resend";
import { captureError } from "@/lib/sentry";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    // Token is sent in the POST body by the frontend verifyEmail() API call
    let token: string | null = null;
    try {
      const body = await request.json();
      token = body?.token || null;
    } catch {
      token = null;
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Verification token is required" },
        { status: 400 }
      );
    }

    // Fetch candidates with non-expired verification tokens then compare hashes
    const candidates = await prisma.user.findMany({
      where: {
        emailVerificationToken: { not: null },
        emailVerificationExpires: { gt: new Date() },
        emailVerified: false,
      },
    });

    let matchedUser: (typeof candidates)[number] | null = null;
    for (const candidate of candidates) {
      const matches = await bcrypt.compare(token, candidate.emailVerificationToken!);
      if (matches) {
        matchedUser = candidate;
        break;
      }
    }

    if (!matchedUser) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: matchedUser.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    // Send welcome email directly
    await sendWelcomeEmail(matchedUser.email!, matchedUser.displayName);

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (err) {
    captureError(err, { route: "POST /api/auth/verify-email" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
