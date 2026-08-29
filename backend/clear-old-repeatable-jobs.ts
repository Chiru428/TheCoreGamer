/**
 * clear-old-repeatable-jobs.ts
 *
 * One-time utility: lists ALL repeatable jobs across every BullMQ queue
 * and removes the stale ones replaced by the new schedules.
 *
 * Run: npx tsx clear-old-repeatable-jobs.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.worker first (has production REDIS_URL), then .env as fallback
config({ path: resolve(__dirname, ".env.worker") });
config({ path: resolve(__dirname, ".env") });

import { Queue } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  console.error("❌ REDIS_URL not set in .env.worker or .env");
  process.exit(1);
}

// Job IDs that are STALE and must be removed
const STALE_JOB_IDS = new Set([
  "deals-poll-hourly",  // replaced by deals-poll-every-12h
]);

// All queue names to inspect (must match names in bullmq.ts)
const QUEUE_NAMES = [
  "deals",
  "igdb-sync",
  "cleanup",
  "algolia",
  "email",
  "newsletter",
  "searchIndex",
  "push",
  "toxicity-check",
];

async function main() {
  console.log("=== BullMQ Repeatable Job Cleanup ===\n");

  let totalRemoved = 0;
  const queuesToClose: Queue[] = [];

  // Each queue gets its own fresh IORedis connection — avoids shared-connection
  // teardown issues when closing queues individually in the loop.
  for (const name of QUEUE_NAMES) {
    const conn = new IORedis(REDIS_URL!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: REDIS_URL!.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
    });
    conn.on("error", () => {}); // suppress exit-time ECONNRESET noise

    const queue = new Queue(name, { connection: conn as any });
    queuesToClose.push(queue);

    const repeatableJobs = await queue.getRepeatableJobs();

    if (repeatableJobs.length === 0) continue;

    console.log(`Queue: "${name}" (${repeatableJobs.length} repeatable job(s))`);

    for (const job of repeatableJobs) {
      const isStale = STALE_JOB_IDS.has(job.id ?? "");
      const icon = isStale ? "🗑️  REMOVING" : "✅ keeping ";
      console.log(
        `  ${icon}  id="${(job.id ?? "none").padEnd(28)}"  pattern="${(job.pattern ?? "").padEnd(14)}"  name="${job.name}"`
      );

      if (isStale) {
        await queue.removeRepeatableByKey(job.key);
        totalRemoved++;
      }
    }

    console.log();
  }

  if (totalRemoved === 0) {
    console.log("✅ Nothing to remove — no stale jobs found.");
    console.log('   (The old "deals-poll-hourly" job may have already been cleared.)');
  } else {
    console.log(`✅ Done — removed ${totalRemoved} stale repeatable job(s).`);
    console.log('   The new "deals-poll-every-12h" schedule registers on next worker startup.');
  }

  // Close all queues gracefully
  await Promise.allSettled(queuesToClose.map((q) => q.close()));

  // Small pause to let connections drain before process exits
  await new Promise((r) => setTimeout(r, 500));
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e.message ?? e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
