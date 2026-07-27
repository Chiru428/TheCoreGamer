import { NextResponse } from "next/server";
import { verifyTOTP } from "@/lib/totp";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { validateBody } from "@/middleware/validateBody";
import { totpVerifySchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { rateLimit } from "@/middleware/rateLimit";
import { csrfProtection } from "@/middleware/csrfProtection";
import { generateRecoveryCodes, hashRecoveryCodes } from "@/lib/recovery";

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

    // FIX: retrieve the pending secret from Redis (never from DB at this stage)
    const redisKey = `2fa-setup:${session.user.id}`;
    const pendingSecret = await redis.get<string>(redisKey);

    if (!pendingSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "2FA setup not initiated or session expired. Please restart setup.",
        },
        { status: 400 }
      );
    }

    const isValid = verifyTOTP(pendingSecret, data.code);

    if (!isValid) {
      return NextResponse.json({ success: false, error: "Invalid 2FA code" }, { status: 400 });
    }

    // Only now persist the verified secret to the database, along with a
    // fresh set of one-time recovery codes (returned once, never again).
    const backupCodes = generateRecoveryCodes();
    const hashedBackupCodes = await hashRecoveryCodes(backupCodes);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        twoFactorSecret: pendingSecret,
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedBackupCodes,
      },
    });

    // Clean up the temporary Redis key
    await redis.del(redisKey);

    return NextResponse.json({
      success: true,
      message: "Two-factor authentication enabled successfully",
      data: { backupCodes },
    });
  } catch (err) {
    captureError(err, { route: "POST /api/auth/2fa/verify" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
