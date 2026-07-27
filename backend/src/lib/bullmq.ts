import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";

// ── Shared ioredis client ────────────────────────────────────────────────────
//
// BullMQ accepts an existing IORedis instance as `connection`.  Sharing one
// client across all queues/workers:
//   • dramatically reduces the number of TCP sockets open to Upstash, and
//   • lets ioredis's built-in retryStrategy silently reconnect after the
//     ECONNRESET drops that Upstash triggers on idle blocking connections.
//
// NOTE: BullMQ internally calls `.duplicate()` on this instance for each
// Worker, so the queue client and every worker each get their own connection
// while still inheriting these resilience settings.
function buildRedisUrl(): string {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  return "redis://localhost:6379";
}

export const redisClient = new IORedis(buildRedisUrl(), {
  maxRetriesPerRequest: null,  // required by BullMQ
  enableReadyCheck: false,     // required by BullMQ

  // Reconnect on ECONNRESET / idle-timeout resets from Upstash.
  // Exponential backoff capped at 10 s; stops after 20 consecutive failures.
  retryStrategy: (times) => {
    if (times > 20) return null;
    return Math.min(times * 250, 10_000);
  },

  // Send a TCP keepalive probe every 15 s to prevent Upstash from treating
  // the blocking worker connection as idle and force-closing it.
  keepAlive: 15_000,

  // Don't open the socket until the first command (avoids an extra connection
  // on module load that would immediately be killed as idle).
  lazyConnect: false,

  // Give up on a single connect attempt after 15 s.
  connectTimeout: 15_000,

  // Upstash TLS endpoint — disable hostname verification for self-signed certs.
  tls: process.env.REDIS_URL?.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
});

// Prevent unhandled error events from crashing the server
redisClient.on("error", (err) => {
  if (isConnectionError(err)) return;
  import("./logger").then(({ logger }) => logger.error(err, "Primary Redis connection error")).catch(() => {});
});

// Intercept duplicate to add error listener to ALL duplicated connections (used by BullMQ)
const originalDuplicate = redisClient.duplicate.bind(redisClient);
redisClient.duplicate = function (options?: Parameters<typeof originalDuplicate>[0]) {
  const dup = originalDuplicate(options as any);
  dup.on("error", (err) => {
    if (isConnectionError(err)) return; // Ignore ECONNRESET
    // Only log if it's not a noisy disconnect
    import("./logger").then(({ logger }) => logger.error(err, "Redis duplicate connection error")).catch(() => {});
  });
  return dup;
};

// Re-export the client as `connection` so existing imports keep working.
// Cast to `any` to bridge the ioredis version mismatch between the top-level
// ioredis package and the bundled copy inside bullmq's node_modules. At runtime
// they are identical; this is a pure TypeScript structural incompatibility.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const connection = redisClient as any;

// ── Helper used by worker error handlers ─────────────────────────────────────
// ioredis handles reconnection automatically; ECONNRESET events are expected
// noise from Upstash's idle-connection policy and should NOT be sent to Sentry.
export function isConnectionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    (err as NodeJS.ErrnoException).code === "ECONNRESET" ||
    err.message.includes("ECONNRESET") ||
    err.message.includes("Connection is closed") ||
    err.message.includes("read ECONNRESET")
  );
}

// Queue definitions
export const emailQueue = new Queue("email", { connection });
export const newsletterQueue = new Queue("newsletter", { connection });
export const searchIndexQueue = new Queue("searchIndex", { connection });
export const pushQueue = new Queue("push", { connection });
export const dealsQueue = new Queue("deals", { connection });
export const toxicityQueue = new Queue("toxicity-check", { connection });
export const igdbSyncQueue = new Queue("igdb-sync", { connection });
export const algoliaQueue = new Queue("algolia", { connection });

[
  emailQueue,
  newsletterQueue,
  searchIndexQueue,
  pushQueue,
  dealsQueue,
  toxicityQueue,
  igdbSyncQueue,
  algoliaQueue,
].forEach((q) => {
  q.on("error", (err) => {
    if (isConnectionError(err)) return;
    import("./logger").then(({ logger }) => logger.error({ err }, `[BullMQ] ${q.name} queue error`)).catch(() => {});
  });
});

// Job type definitions
export interface EmailJobData {
  type:
    | "welcome"
    | "verification"
    | "reset"
    | "approval"
    | "rejection"
    | "editor-notification"
    | "newsletter-confirm"
    | "new-device-alert"
    | "account-deleted";
  to: string | string[];
  subject?: string;
  data: Record<string, unknown>;
}

export interface NewsletterSponsoredContent {
  sponsor: string;
  headline: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  imageUrl?: string;
}

export interface NewsletterJobData {
  campaignId: string;
  subject: string;
  htmlContent: string;
  subscriberEmails: string[];
  batchIndex: number;
  sponsoredContent?: NewsletterSponsoredContent;
}

export interface SearchIndexJobData {
  articleId: string;
  action: "index" | "remove";
}

export interface PushJobData {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  /** When set, only these users' subscriptions receive the push (omit to broadcast). */
  userIds?: string[];
}

export interface DealsJobData {
  trigger: "poll";
}

export interface IGDBImportJobData {
  igdbId: number;
  gameId: string;
}

// Helper to add jobs
export async function addEmailJob(data: EmailJobData) {
  try {
    return await emailQueue.add("send-email", data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    });
  } catch (err) {
    console.error("[BullMQ] Failed to enqueue email job", err);
    return null;
  }
}

export async function addNewsletterJob(data: NewsletterJobData) {
  try {
    return await newsletterQueue.add("send-newsletter", data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    });
  } catch (err) {
    console.error("[BullMQ] Failed to enqueue newsletter job", err);
    return null;
  }
}

export async function addSearchIndexJob(data: SearchIndexJobData) {
  try {
    return await searchIndexQueue.add("index-article", data, {
      attempts: 2,
      backoff: { type: "fixed", delay: 1000 },
    });
  } catch (err) {
    console.error("[BullMQ] Failed to enqueue search index job", err);
    return null;
  }
}

export async function addPushJob(data: PushJobData) {
  try {
    return await pushQueue.add("send-push", data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    });
  } catch (err) {
    console.error("[BullMQ] Failed to enqueue push job", err);
    return null;
  }
}

export async function addDealsJob(data: DealsJobData) {
  try {
    return await dealsQueue.add("poll-prices", data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    });
  } catch (err) {
    console.error("[BullMQ] Failed to enqueue deals job", err);
    return null;
  }
}

export async function addIGDBImportJob(data: IGDBImportJobData) {
  try {
    return await igdbSyncQueue.add("import-game", data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: true,
      removeOnFail: 100,
    });
  } catch (err) {
    console.error("[BullMQ] Failed to enqueue IGDB import job", err);
    return null;
  }
}

export async function addToxicityCheckJob(data: { commentId: string; text: string }) {
  try {
    return await toxicityQueue.add("check", data, {
      attempts: 2,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: true,
      removeOnFail: 100,
    });
  } catch (err) {
    console.error("[BullMQ] Failed to enqueue toxicity check job", err);
    return null;
  }
}

export { Queue, Worker, type Job, connection };
