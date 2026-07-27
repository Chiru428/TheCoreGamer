import { NextResponse } from "next/server";
import { requireRole } from "@/middleware/requireRole";
import { captureError } from "@/lib/sentry";
import { successResponse, errorResponse } from "@/types";
import {
  Queue,
  connection,
  emailQueue,
  newsletterQueue,
  searchIndexQueue,
  pushQueue,
  dealsQueue,
  toxicityQueue,
  igdbSyncQueue,
  algoliaQueue,
} from "@/lib/bullmq";

// Read-only handle on the article-cron queue. We deliberately avoid importing
// workers/article.worker.ts here, since that module starts a Worker and
// registers its repeatable job — neither of which should happen in the
// Next.js server process.
const articleCronQueue = new Queue("article-cron", { connection: connection as any });

const QUEUES = {
  articleCron: articleCronQueue,
  email: emailQueue,
  newsletter: newsletterQueue,
  searchIndex: searchIndexQueue,
  push: pushQueue,
  deals: dealsQueue,
  toxicity: toxicityQueue,
  igdbSync: igdbSyncQueue,
  algolia: algoliaQueue,
} as const;

const DEGRADED_FAILED_THRESHOLD = 10;
const CRITICAL_FAILED_THRESHOLD = 50;
// const CRITICAL_WAITING_THRESHOLD = 1000;

const TIMEOUT_MS = 2000;

export async function GET(request: Request) {
  try {
    const roleCheck = await requireRole(["ADMIN"], request);
    if (roleCheck) return roleCheck;

      const entries = await Promise.all(
        Object.entries(QUEUES).map(async ([name, queue]) => {
          try {
            const counts = await Promise.race([
              queue.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error("BullMQ timeout")), TIMEOUT_MS))
            ]);
            return [
              name,
              {
                waiting: counts.waiting ?? 0,
                active: counts.active ?? 0,
                completed: counts.completed ?? 0,
                failed: counts.failed ?? 0,
                delayed: counts.delayed ?? 0,
              },
            ] as const;
          } catch (err) {
            return [
              name,
              { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
            ] as const;
          }
        })
      );

      const queues = Object.fromEntries(entries);

    let status: "healthy" | "degraded" | "critical" = "healthy";
    for (const counts of Object.values(queues)) {
      if (counts.failed > CRITICAL_FAILED_THRESHOLD || counts.waiting > CRITICAL_WAITING_THRESHOLD) {
        status = "critical";
        break;
      }
      if (counts.failed > DEGRADED_FAILED_THRESHOLD) {
        status = "degraded";
      }
    }

    return NextResponse.json(successResponse({ queues, timestamp: new Date().toISOString(), status }));
  } catch (err) {
    console.error("HEALTH_API_ERROR", err);
    captureError(err);
    return NextResponse.json(errorResponse("Internal server error"), { status: 500 });
  }
}
