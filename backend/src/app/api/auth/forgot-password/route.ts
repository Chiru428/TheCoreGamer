import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/middleware/validateBody";
import { rateLimit } from "@/middleware/rateLimit";
import { csrfProtection } from "@/middleware/csrfProtection";
import { forgotPasswordSchema } from "@/validators";
import { sendPasswordResetEmail } from "@/lib/resend";
import { captureError } from "@/lib/sentry";

export async function POST(request: Request) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const rateLimitResponse = await rateLimit(request, "AUTH");
    if (rateLimitResponse) return rateLimitResponse;

    const { data, error } = await validateBody(request, forgotPasswordSchema);
    if (error) return error;

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a reset link has been sent.",
      });
    }

    const rawToken = crypto.randomUUID();
    const hashedToken = await bcrypt.hash(rawToken, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send email directly instead of queueing to ensure delivery and surface errors
    await sendPasswordResetEmail(data.email, rawToken);

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a reset link has been sent.",
    });
  } catch (err) {
    captureError(err, { route: "POST /api/auth/forgot-password" });
    console.error("Failed to send password reset email:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
