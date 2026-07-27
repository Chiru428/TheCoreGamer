import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/withRetry";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { parsePagination, buildPaginationMeta, successResponse, errorResponse } from "@/types";
import type { Prisma, Role } from "@/generated/prisma";
import { rateLimit } from "@/middleware/rateLimit";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(request, "READ");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN", "EDITOR"], request);
    if (roleCheck) return roleCheck;

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const where: Prisma.UserWhereInput = {};
    const role = searchParams.get("role");
    if (role) {
      if (role.includes(',')) {
        where.role = { in: role.split(',') as Role[] };
      } else {
        where.role = role as Role;
      }
    }

    const search = searchParams.get("search");
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await withRetry(() =>
      Promise.all([
        prisma.user
          .findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              role: true,
              emailVerified: true,
              twoFactorEnabled: true,
              createdAt: true,
              lastLoginAt: true,
              _count: { select: { Article_Article_authorIdToUser: true, Comment: true } },
            },
          })
          .then((users) =>
            users.map((u) => ({
              ...u,
              _count: {
                articles: u._count.Article_Article_authorIdToUser,
                comments: u._count.Comment,
              },
            }))
          ),
        prisma.user.count({ where }),
      ])
    );

    return NextResponse.json(
      successResponse(users, undefined, buildPaginationMeta(page, limit, total))
    );
  } catch (err: any) {
    captureError(err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
