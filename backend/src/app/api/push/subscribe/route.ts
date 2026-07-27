import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateBody } from "@/middleware/validateBody";
import { csrfProtection } from "@/middleware/csrfProtection";
import { pushSubscribeSchema } from "@/validators";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function POST(request: Request) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const { data, error } = await validateBody(request, pushSubscribeSchema);
    if (error) return error;

    const session = await auth();

    await prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      update: { keys: data.keys, userId: session?.user?.id },
      create: { endpoint: data.endpoint, keys: data.keys, userId: session?.user?.id },
    });

    return NextResponse.json(successResponse(null, "Push subscription saved"), { status: 201 });
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    const body = await request.json();
    if (!body.endpoint)
      return NextResponse.json(errorResponse("Endpoint required"), { status: 400 });

    await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint } });
    return NextResponse.json(successResponse(null, "Push subscription removed"));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
