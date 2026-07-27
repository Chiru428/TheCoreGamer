import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { csrfProtection } from "@/middleware/csrfProtection";

// One-time fix: stamp publishedAt = createdAt for all PUBLISHED articles where publishedAt is null.
// Call: POST /api/admin/fix-published-dates  (ADMIN only)
export async function POST(request: NextRequest) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const broken = await prisma.article.findMany({
    where: { status: "PUBLISHED", publishedAt: null },
    select: { id: true, createdAt: true, title: true },
  });

  const results: string[] = [];
  for (const a of broken) {
    await prisma.article.update({
      where: { id: a.id },
      data: {
        publishedAt: a.createdAt,
        originallyPublishedAt: a.createdAt,
      },
    });
    results.push(`Fixed: "${a.title}" → ${a.createdAt.toISOString()}`);
  }
  


  return NextResponse.json({ fixed: results.length, details: results });
}
