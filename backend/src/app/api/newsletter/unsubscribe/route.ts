import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";

export async function POST(request: NextRequest) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      const body = await request.json().catch(() => ({}));
      const email = body.email;
      if (email) {
        await prisma.newsletterSubscriber.updateMany({
          where: { email },
          data: { unsubscribedAt: new Date(), confirmed: false },
        });
        return NextResponse.json(successResponse(null, "Unsubscribed"));
      }
      return NextResponse.json(errorResponse("Token or email required"), { status: 400 });
    }

    const subscriber = await prisma.newsletterSubscriber.findFirst({
      where: { confirmToken: token },
    });
    if (subscriber) {
      await prisma.newsletterSubscriber.update({
        where: { id: subscriber.id },
        data: { unsubscribedAt: new Date(), confirmed: false },
      });
    }

    return NextResponse.json(successResponse(null, "Unsubscribed"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
