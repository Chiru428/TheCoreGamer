import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

// GET /api/newsletter/subscribers — admin only
export async function GET(request: Request) {
  try {
    const roleCheck = await requireRole(["ADMIN", "EDITOR"], request);
    if (roleCheck) return roleCheck;

    const [count, subscribers] = await Promise.all([
      prisma.newsletterSubscriber.count({ where: { confirmed: true } }),
      prisma.newsletterSubscriber.findMany({
        where: { confirmed: true },
        orderBy: { subscribedAt: "desc" },
        select: {
          id: true,
          email: true,
          confirmed: true,
          preferences: true,
          subscribedAt: true,
          unsubscribedAt: true,
        },
      }),
    ]);

    return NextResponse.json(successResponse({ count, subscribers }));
  } catch (err) {
    captureError(err, { route: "GET /api/newsletter/subscribers" });
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
