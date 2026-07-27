import { NextResponse } from "next/server";
import { generateTOTPSecret, generateTOTPUri } from "@/lib/totp";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
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

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { success: false, error: "2FA is already enabled" },
        { status: 400 }
      );
    }

    // FIX: generate secret and store it temporarily in Redis (10 min TTL)
    // Never persist to DB until the user verifies the first TOTP code
    // Never return the raw secret in the API response
    const secret = generateTOTPSecret();
    const otpauthUrl = generateTOTPUri(user.email || "user", secret);

    const redisKey = `2fa-setup:${session.user.id}`;
    await redis.set(redisKey, secret, { ex: 600 }); // 10 minute expiry

    return NextResponse.json({
      success: true,
      data: {
        // Return only the otpauth URI for QR rendering — never the raw secret
        qrCodeUri: otpauthUrl,
      },
    });
  } catch (err) {
    captureError(err, { route: "POST /api/auth/2fa/setup" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
