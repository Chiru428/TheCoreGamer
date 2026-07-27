import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/middleware/validateBody";
import { rateLimit } from "@/middleware/rateLimit";
import { csrfProtection } from "@/middleware/csrfProtection";
import { resetPasswordSchema } from "@/validators";
import { captureError } from "@/lib/sentry";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const rateLimitResponse = await rateLimit(request, "AUTH");
    if (rateLimitResponse) return rateLimitResponse;

    const { data, error } = await validateBody(request, resetPasswordSchema);
    if (error) return error;

    // Fetch all users with a non-expired reset token, then bcrypt.compare against each.
    // In practice there will be at most one, but we must not look up by raw token value
    // since only the hash is stored.
    const candidates = await prisma.user.findMany({
      where: {
        passwordResetToken: { not: null },
        passwordResetExpires: { gt: new Date() },
      },
    });

    let matchedUser: (typeof candidates)[number] | null = null;
    for (const candidate of candidates) {
      const matches = await bcrypt.compare(data.token, candidate.passwordResetToken!);
      if (matches) {
        matchedUser = candidate;
        break;
      }
    }

    if (!matchedUser) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    await prisma.user.update({
      where: { id: matchedUser.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        loginAttempts: 0,
        lockUntil: null,
        sessionVersion: { increment: 1 }, // Invalidate all existing sessions
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (err) {
    captureError(err, { route: "POST /api/auth/reset-password" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
