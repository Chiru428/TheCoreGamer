import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { recordLoginDevice, parseUserAgent } from "@/lib/devices";
import { sendNewDeviceAlertEmail } from "@/lib/resend";
import { csrfProtection } from "@/middleware/csrfProtection";

export async function POST(request: Request) {
  try {
    const csrfError = csrfProtection(request);
    if (csrfError) return csrfError;

    const internalSecret = request.headers.get("x-internal-secret");
    if (!internalSecret || internalSecret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    const { email, name, image, provider, providerAccountId, currentUserId } = await request.json();

    if (!provider || !providerAccountId) {
      return NextResponse.json(errorResponse("Missing required fields"), { status: 400 });
    }

    // Linking flow: an already-authenticated user is attaching a new provider to
    // their existing account (from Settings > Security), rather than signing
    // in/up. Resolve directly by the caller's session id instead of guessing
    // from email — Steam supplies none, and a shared email would otherwise
    // require risky inference.
    if (currentUserId) {
      const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } });
      if (!currentUser) {
        return NextResponse.json(errorResponse("Account not found"), { status: 404 });
      }

      const linkedElsewhere = await prisma.user.findFirst({
        where: { oauthProvider: provider, oauthId: providerAccountId, id: { not: currentUserId } },
      });
      if (linkedElsewhere) {
        return NextResponse.json(
          errorResponse(`This ${provider} account is already linked to another user`),
          { status: 409 }
        );
      }

      const linkedUser = await prisma.user.update({
        where: { id: currentUserId },
        data: { oauthProvider: provider, oauthId: providerAccountId, lastLoginAt: new Date() },
      });

      const { device, isNewDevice } = await recordLoginDevice(linkedUser.id, request);
      if (isNewDevice && linkedUser.email) {
        const { browser, os } = parseUserAgent(device.userAgent);
        sendNewDeviceAlertEmail(linkedUser.email, {
          displayName: linkedUser.displayName,
          browser,
          os,
          ipAddress: device.ipAddress,
          loginAt: device.lastSeenAt.toISOString(),
        }).catch(() => {});
      }

      return NextResponse.json(
        successResponse({
          id: linkedUser.id,
          email: linkedUser.email,
          role: linkedUser.role,
          username: linkedUser.username,
          displayName: linkedUser.displayName,
          avatarUrl: linkedUser.avatarUrl,
        })
      );
    }

    // Steam and other providers may not supply an email — match by provider+id first
    let user;
    if (!email) {
      user = await prisma.user.findFirst({
        where: { oauthProvider: provider, oauthId: providerAccountId },
      });
    } else {
      user = await prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      const username = email ? email.split("@")[0] + "_" + Date.now() : `${provider}${Date.now()}`;

      user = await prisma.user.create({
        data: {
          email: email || null,
          username,
          displayName: name || "User",
          avatarUrl: image,
          oauthProvider: provider,
          oauthId: providerAccountId,
          emailVerified: true,
          role: "USER",
        },
      });
    } else {
      // An existing account was found by email.
      // If it's already linked to a DIFFERENT OAuth identity (e.g. another Google account),
      // block the sync to avoid account takeover.
      if (user.oauthId && user.oauthId !== providerAccountId) {
        return NextResponse.json(
          errorResponse(
            `This account is already linked to a different ${user.oauthProvider ?? provider} account`
          ),
          { status: 409 }
        );
      }
      // Otherwise — whether it was a credentials-only account or already linked to this
      // same provider — link (or re-confirm) the OAuth identity and sign in.
      // Google's email verification guarantees ownership, so auto-linking is safe.
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          oauthProvider: provider,
          oauthId: providerAccountId,
          lastLoginAt: new Date(),
        },
      });
    }

    const { device, isNewDevice } = await recordLoginDevice(user.id, request);
    if (isNewDevice && user.email) {
      const { browser, os } = parseUserAgent(device.userAgent);
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
        role: user.role,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      })
    );
  } catch (err) {
    captureError(err, { route: "POST /api/auth/oauth-sync" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
