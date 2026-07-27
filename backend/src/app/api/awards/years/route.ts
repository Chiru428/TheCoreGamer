import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cacheGet, cacheSet } from '@/lib/redis';
import { successResponse, errorResponse } from '@/types';
import { captureError } from '@/lib/sentry';

export async function GET() {
  try {
    const cacheKey = 'awards:years';
    try {
      const cached = await cacheGet<number[]>(cacheKey);
      if (cached) return NextResponse.json(successResponse(cached));
    } catch {
      /* intentionally empty */
    }

    // Distinct years that have at least one award entry
    const rows = await prisma.award.findMany({
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'desc' },
    });

    const years = rows.map((r) => r.year);
    try {
      await cacheSet(cacheKey, years, 3600);
    } catch {
      /* intentionally empty */
    }
    return NextResponse.json(successResponse(years));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 });
  }
}
