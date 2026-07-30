import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/redis";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

interface RouteParams {
  params: Promise<{ year: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { year } = await params;
    const yearInt = parseInt(year, 10);
    if (isNaN(yearInt)) {
      return NextResponse.json(errorResponse("Invalid year"), { status: 400 });
    }

    const cacheKey = `awards:${yearInt}`;
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) {
        return NextResponse.json(successResponse(cached));
      }
    } catch {
      /* intentionally empty */
    }

    const awards = await prisma.award.findMany({
      where: { year: yearInt },
      include: {
        winnerGame: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImageUrl: true,
          }
        },
      },
      orderBy: { createdAt: "asc" }
    });

    const enrichedAwards = await Promise.all(
      awards.map(async (award) => {
        // Aggregate votes for this award
        const votes = await prisma.awardVote.groupBy({
          by: ["gameId"],
          where: { awardId: award.id },
          _count: { _all: true },
        });

        const voteCounts: Record<string, number> = {};
        let totalVotes = 0;
        votes.forEach(v => {
          voteCounts[v.gameId] = v._count._all;
          totalVotes += v._count._all;
        });

        let nominees = [];
        try {
          if (award.nomineesJson) {
            nominees = typeof award.nomineesJson === 'string' 
              ? JSON.parse(award.nomineesJson) 
              : award.nomineesJson;
          }
        } catch (e) {
          console.error("Failed to parse nomineesJson", e);
        }

        return {
          award,
          nominees,
          voteCounts,
          totalVotes,
        };
      })
    );

    try {
      await cacheSet(cacheKey, enrichedAwards, 300); // 5 minutes cache
    } catch {
      /* intentionally empty */
    }
    return NextResponse.json(successResponse(enrichedAwards));
  } catch (err: any) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
