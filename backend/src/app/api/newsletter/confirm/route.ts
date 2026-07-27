import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json(errorResponse("Token required"), { status: 400 });

    const subscriber = await prisma.newsletterSubscriber.findFirst({
      where: { confirmToken: token },
    });
    if (!subscriber) return NextResponse.json(errorResponse("Invalid token"), { status: 400 });

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { confirmed: true },
    });

    return NextResponse.json(successResponse(null, "Subscription confirmed"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
