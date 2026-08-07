import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { captureError, errorResponse, successResponse, validateBody } from "@/lib/utils";
import { changePasswordSchema } from "@/validators";
import bcrypt from "bcrypt";
import { rateLimitAuth } from "@/lib/redis";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateLimitError = await rateLimitAuth(ip);
    if (rateLimitError) {
      return NextResponse.json(errorResponse("Too many attempts. Try again later."), {
        status: 429,
      });
    }

    const session = await getSession(request);
    if (!session?.user) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    const { data, error } = await validateBody(request, changePasswordSchema);
    if (error) return NextResponse.json(errorResponse(error), { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!user) {
      return NextResponse.json(errorResponse("User not found"), { status: 404 });
    }

    if (!user.passwordHash) {
      return NextResponse.json(errorResponse("You must create a password before you can change it."), { status: 400 });
    }

    const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(errorResponse("Incorrect current password"), { status: 401 });
    }

    const newPasswordHash = await bcrypt.hash(data.newPassword, 12);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newPasswordHash },
    });

    return NextResponse.json(successResponse(null, "Password changed successfully"));
  } catch (err) {
    captureError(err, { route: "POST /api/user/change-password" });
    console.error("Change password error:", err);
    return NextResponse.json(errorResponse("Internal Server Error"), { status: 500 });
  }
}
