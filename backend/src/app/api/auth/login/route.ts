import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { rateLimit } from "@/middleware/rateLimit";
import { validateBody } from "@/middleware/validateBody";
import { loginSchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { recordLoginDevice, parseUserAgent } from "@/lib/devices";
import { sendNewDeviceAlertEmail } from "@/lib/resend";
import { csrfProtection } from "@/middleware/csrfProtection";
import { findRecoveryCodeIndex } from "@/lib/recovery";

/**
 * POST /api/auth/login
 *
 * Validates credentials against the DB and returns the safe user object.
 * Called by the frontend NextAuth Credentials authorize() function.
 * JWT minting is done on the frontend — this endpoint only authenticates.
 */
export async function POST(request: Request) {
  try {
    const csrfError = csrfProtection(request);
    if (csrfError) return csrfError;

    // 10 login attempts per hour per IP
    const rateLimitResponse = await rateLimit(request, "LOGIN");
    if (rateLimitResponse) return rateLimitResponse;

    // Use validateBody with loginSchema for consistent email format validation,
    // length limits, and structured field errors — same as all other auth routes.
    const { data, error } = await validateBody(request, loginSchema);
    if (error) return error;

    const { email, password, totpCode, recoveryCode } = data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      return NextResponse.json(errorResponse("Invalid credentials"), { status: 401 });
    }

    if (!user.emailVerified) {
      return NextResponse.json(errorResponse("EMAIL_NOT_VERIFIED"), { status: 403 });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return NextResponse.json(errorResponse("Account locked. Try again later."), { status: 423 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      const attempts = user.loginAttempts + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;
      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: attempts, lockUntil },
      });
      return NextResponse.json(errorResponse("Invalid credentials"), { status: 401 });
    }

    // 2FA check — accepts either a TOTP code or a one-time recovery code
    let consumedRecoveryCodeIndex: number | null = null;
    if (user.twoFactorEnabled) {
      if (!totpCode && !recoveryCode) {
        // Signal to the frontend that 2FA is needed — client must re-submit with totpCode/recoveryCode
        return NextResponse.json(
          { success: false, requiresTwoFactor: true, error: "2FA_REQUIRED" },
          { status: 401 }
        );
      }

      if (recoveryCode) {
        consumedRecoveryCodeIndex = await findRecoveryCodeIndex(recoveryCode, user.twoFactorBackupCodes);
        if (consumedRecoveryCodeIndex === -1) {
          return NextResponse.json(errorResponse("Invalid recovery code"), { status: 401 });
        }
      } else {
        // Lazy-import to avoid loading TOTP libs on every request
        const { verifyTOTP } = (await import("@/lib/totp")) as {
          verifyTOTP: (s: string, c: string) => boolean;
        };
        const valid2FA = verifyTOTP(user.twoFactorSecret!, totpCode!);
        if (!valid2FA) {
          return NextResponse.json(errorResponse("Invalid 2FA code"), { status: 401 });
        }
      }
    }

    // Reset failed attempts on success, and burn the recovery code (single-use) if one was used
    const remainingBackupCodes =
      consumedRecoveryCodeIndex != null
        ? user.twoFactorBackupCodes.filter((_, i) => i !== consumedRecoveryCodeIndex)
        : undefined;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockUntil: null,
        lastLoginAt: new Date(),
        ...(remainingBackupCodes ? { twoFactorBackupCodes: remainingBackupCodes } : {}),
      },
    });

    const { device, isNewDevice } = await recordLoginDevice(user.id, request);
    if (isNewDevice && user.email) {
      const { browser, os } = parseUserAgent(device.userAgent);
      // Fire-and-forget — don't block login response for notification email
      sendNewDeviceAlertEmail(user.email, {
        displayName: user.displayName,
        browser,
        os,
        ipAddress: device.ipAddress,
        loginAt: device.lastSeenAt.toISOString(),
      }).catch(() => {});
    }

    return NextResponse.json(
      successResponse({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        username: user.username,
      })
    );
  } catch (err) {
    captureError(err, { route: "POST /api/auth/login" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
