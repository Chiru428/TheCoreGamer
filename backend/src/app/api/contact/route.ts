import { NextResponse } from "next/server";
import { validateBody } from "@/middleware/validateBody";
import { rateLimit } from "@/middleware/rateLimit";
import { csrfProtection } from "@/middleware/csrfProtection";
import { contactSchema } from "@/validators";
import { sendContactMessageEmail } from "@/lib/resend";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

export async function POST(request: Request) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    // AUTH tier is the strictest public limiter — appropriate for an email-sending endpoint.
    const rateLimitResponse = await rateLimit(request, "AUTH");
    if (rateLimitResponse) return rateLimitResponse;

    const { data, error } = await validateBody(request, contactSchema);
    if (error) return error;

    // Honeypot filled → bot. Pretend success, send nothing.
    if (data.website) {
      return NextResponse.json(successResponse(null, "Message sent"));
    }

    const result = await sendContactMessageEmail({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
    });

    if (result.error) {
      captureError(result.error, { route: "POST /api/contact" });
      console.error("Contact email failed:", result.error);
      return NextResponse.json(
        errorResponse("Could not send message", "Please email us directly at support@thecoregamer.com"),
        { status: 502 }
      );
    }

    return NextResponse.json(successResponse(null, "Message sent"));
  } catch (err) {
    captureError(err, { route: "POST /api/contact" });
    console.error("Contact form error:", err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
