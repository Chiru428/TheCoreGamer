import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

// Public health check for uptime monitors — no auth, no rate limit.
export async function GET() {
  const [db, cache] = await Promise.all([
    prisma
      .$queryRaw`SELECT 1`
      .then(() => true)
      .catch(() => false),
    redis
      .ping()
      .then(() => true)
      .catch(() => false),
  ]);

  return NextResponse.json({
    status: "ok",
    db,
    cache,
    timestamp: new Date().toISOString(),
  });
}
