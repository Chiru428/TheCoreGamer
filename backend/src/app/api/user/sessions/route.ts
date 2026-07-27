import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/requireRole";
import { rateLimit } from "@/middleware/rateLimit";
import { getClientIp } from "@/middleware/rateLimit";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { parseUserAgent, anonymizeIp, hashDevice } from "@/lib/devices";

export async function GET(request: NextRequest) {
  try {
    const rl = await rateLimit(request, "READ");
    if (rl) return rl;

    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const session = authCheck.session!;

    const devices = await prisma.userDevice.findMany({
      where: { userId: session.user.id },
      orderBy: { lastSeenAt: "desc" },
    });

    const currentUserAgent = request.headers.get("user-agent") || "unknown";
    const currentAnonymizedIp = anonymizeIp(getClientIp(request));
    const currentDeviceHash = hashDevice(currentUserAgent, currentAnonymizedIp);

    return NextResponse.json(
      successResponse(
        devices.map((d) => {
          const { browser, os, deviceType, browserVersion } = parseUserAgent(d.userAgent);
          return {
            id: d.id,
            browser,
            browserVersion,
            os,
            deviceType,
            ipAddress: d.ipAddress,
            location: d.location,
            lastSeenAt: d.lastSeenAt,
            createdAt: d.createdAt,
            revoked: d.revokedAt !== null,
            isCurrent: d.deviceHash === currentDeviceHash,
          };
        })
      )
    );
  } catch (err) {
    captureError(err, { route: "GET /api/user/sessions" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
