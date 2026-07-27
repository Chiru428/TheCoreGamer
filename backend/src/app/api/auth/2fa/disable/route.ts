import { NextResponse } from "next/server";
import { verifyTOTP } from "@/lib/totp";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateBody } from "@/middleware/validateBody";
import { totpVerifySchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { rateLimit } from "@/middleware/rateLimit";
import { csrfProtection } from "@/middleware/csrfProtection";

export async function POST(request: Request) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const rateLimitResponse = await rateLimit(request, "AUTH");
    if (rateLimitResponse) return rateLimitResponse;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await validateBody(request, totpVerifySchema);
    if (error) return error;

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ success: false, error: "2FA is not enabled" }, { status: 400 });
    }

    const isValid = verifyTOTP(user.twoFactorSecret, data.code);
    if (!isValid) {
      return NextResponse.json({ success: false, error: "Invalid 2FA code" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: [] },
    });

    return NextResponse.json({ success: true, message: "Two-factor authentication disabled" });
  } catch (err) {
    captureError(err, { route: "POST /api/auth/2fa/disable" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
