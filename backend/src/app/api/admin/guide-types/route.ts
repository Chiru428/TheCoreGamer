import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/types";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/middleware/rateLimit";

export async function GET(request: Request) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    if (!["ADMIN", "EDITOR", "AUTHOR"].includes(session.user.role)) {
      return NextResponse.json(errorResponse("Forbidden"), { status: 403 });
    }

    const articles = await prisma.article.findMany({
      where: { 
        contentType: "GUIDE",
        guideType: { not: null }
      },
      select: { guideType: true },
      distinct: ['guideType'],
      orderBy: { guideType: 'asc' }
    });

    const types = articles.map(a => a.guideType).filter(Boolean);
    
    return NextResponse.json(successResponse(types));
  } catch (err) {
    console.error("Failed to fetch guide types:", err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
