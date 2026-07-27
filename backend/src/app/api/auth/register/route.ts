import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

import { prisma } from "@/lib/prisma";
import { validateBody } from "@/middleware/validateBody";
import { rateLimit } from "@/middleware/rateLimit";
import { csrfProtection } from "@/middleware/csrfProtection";
import { registerSchema } from "@/validators";
import { sendVerificationEmail } from "@/lib/resend";
import { captureError } from "@/lib/sentry";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const csrf = csrfProtection(request);
    if (csrf) return csrf;

    // Rate limit — 5 registrations per hour per IP
    const rateLimitResponse = await rateLimit(request, "REGISTER");
    if (rateLimitResponse) return rateLimitResponse;

    // Validate body
    const { data, error } = await validateBody(request, registerSchema);
    if (error) return error;

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });

    if (existingUser) {
      const field = existingUser.email === data.email ? "email" : "username";
      return NextResponse.json(
        { success: false, error: `This ${field} is already registered` },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);
    const rawVerificationToken = crypto.randomUUID();
    const hashedVerificationToken = await bcrypt.hash(rawVerificationToken, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        displayName: data.displayName,
        passwordHash,
        role: "USER",
        emailVerificationToken: hashedVerificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    });

    // Send email directly instead of queueing to ensure delivery and surface errors
    await sendVerificationEmail(data.email, rawVerificationToken, user.displayName);

    return NextResponse.json(
      {
        success: true,
        message: "Account created. Please check your email to verify your account.",
        data: { id: user.id, email: user.email, username: user.username },
      },
      { status: 201 }
    );
  } catch (err) {
    captureError(err, { route: "POST /api/auth/register" });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
