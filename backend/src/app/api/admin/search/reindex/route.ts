import { NextResponse } from "next/server";
import { requireRole } from "@/middleware/requireRole";
import { rateLimit } from "@/middleware/rateLimit";
import { validateBody } from "@/middleware/validateBody";
import { csrfProtection } from "@/middleware/csrfProtection";
import { reindexSearchSchema } from "@/validators";
import { algoliaQueue } from "@/lib/bullmq";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";

const REINDEX_JOBS: Record<string, string[]> = {
  articles: ["full-reindex-articles"],
  games: ["full-reindex-games"],
  tags: ["full-reindex-tags"],
  users: ["full-reindex-users"],
  all: ["full-reindex-articles", "full-reindex-games", "full-reindex-tags", "full-reindex-users"],
};

export async function POST(request: Request) {
  const csrfError = csrfProtection(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitResponse = await rateLimit(request, "WRITE");
    if (rateLimitResponse) return rateLimitResponse;

    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

    const { data, error } = await validateBody(request, reindexSearchSchema);
    if (error) return error;

    const jobNames = REINDEX_JOBS[data.index];
    await Promise.all(
      jobNames.map((name) =>
        algoliaQueue.add(name, {}, { attempts: 1, removeOnComplete: true, removeOnFail: 50 })
      )
    );

    return NextResponse.json(successResponse({ queued: jobNames }));
  } catch (err) {
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
