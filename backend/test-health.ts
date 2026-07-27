import {
  emailQueue,
  newsletterQueue,
  searchIndexQueue,
  pushQueue,
  dealsQueue,
  toxicityQueue,
  igdbSyncQueue,
  algoliaQueue,
  connection
} from "./src/lib/bullmq";
import { Queue } from "bullmq";

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

async function main() {
  try {
    const entries = await Promise.all(
      Object.entries(QUEUES).map(async ([name, queue]) => {
        try {
          const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
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
          console.error(`Error in queue ${name}:`, err);
          return [
            name,
            { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
          ] as const;
        }
      })
    );

    const queues = Object.fromEntries(entries);
    console.log("Success:", queues);
  } catch (e) {
    console.error("Main error:", e);
  } finally {
    process.exit(0);
  }
}
main();
