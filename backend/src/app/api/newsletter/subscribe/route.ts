import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { validateBody } from "@/middleware/validateBody";
import { rateLimit } from "@/middleware/rateLimit";
import { newsletterSubscribeSchema } from "@/validators";
import { sendNewsletterConfirmationEmail } from "@/lib/resend";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import { csrfProtection } from "@/middleware/csrfProtection";

export async function POST(request: Request) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const { data, error } = await validateBody(request, newsletterSubscribeSchema);
    if (error) return error;

    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email: data.email } });
    if (existing && existing.confirmed) {
      return NextResponse.json(successResponse(null, "Already subscribed"));
    }

    const confirmToken = crypto.randomUUID();

    if (existing) {
      await prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: {
          confirmToken,
          preferences: (data.preferences || {}) as Prisma.InputJsonValue,
          unsubscribedAt: null,
        },
      });
    } else {
      await prisma.newsletterSubscriber.create({
        data: {
          email: data.email,
          confirmToken,
          preferences: (data.preferences || {}) as Prisma.InputJsonValue,
        },
      });
    }

    // Send email directly instead of queueing to ensure delivery and surface errors
    await sendNewsletterConfirmationEmail(data.email, confirmToken);

    return NextResponse.json(successResponse(null, "Confirmation email sent"), { status: 201 });
  } catch (err) {
    captureError(err);
    console.error("Failed to send newsletter email:", err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
