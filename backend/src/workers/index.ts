// Worker runner — starts all BullMQ workers as a single long-running process.
// Development:  npm run dev:workers   (npx tsx, hot-reloadable)
// Production:   npm run workers:start (PM2 via ecosystem.config.js)

import "../lib/tracing";

import { startDealsWorker } from "./deals.worker";
import { emailWorker } from "./email.worker";
import { pushWorker } from "./push.worker";
import { newsletterWorker } from "./newsletter.worker";
import { searchIndexWorker } from "./searchIndex.worker";
import { articleWorker } from "./article.worker";
import { toxicityWorker } from "./toxicity.worker";
import { igdbWorker } from "./igdb.worker";
import { startAlgoliaWorker } from "./algolia.worker";
import { configureIndexes } from "@/lib/algolia";
import { redis } from "@/lib/redis";
import { captureError } from "@/lib/sentry";
import { logger } from "@/lib/logger";

const algoliaWorker = startAlgoliaWorker();
const dealsWorker = startDealsWorker();

// One-time Algolia index/replica/settings configuration. Gated by a permanent
// Redis flag so it never re-runs automatically after the first successful deploy.
const ALGOLIA_CONFIGURED_KEY = "algolia:indexes:configured";
(async () => {
  try {
    const configured = await redis.get(ALGOLIA_CONFIGURED_KEY);
    if (!configured) {
      await configureIndexes();
      await redis.set(ALGOLIA_CONFIGURED_KEY, "1");
      logger.info("Algolia indexes configured");
    }
  } catch (err) {
    captureError(err);
  }
})();

logger.info("[Workers] All TheCoreGamer workers started");
logger.info("[Workers]   - Email worker");
logger.info("[Workers]   - Newsletter worker");
logger.info("[Workers]   - Search index worker");
logger.info("[Workers]   - Algolia sync worker");
logger.info("[Workers]   - Push notification worker");
logger.info("[Workers]   - Article cron worker (scheduling & embargoes)");
logger.info("[Workers]   - Deals price poll worker (hourly ITAD sync)");
logger.info("[Workers]   - IGDB sync worker (imports & nightly rating refresh)");

// Start a tiny HTTP server to satisfy Render's Web Service port binding requirement
// and provide a target for cron-job.org without running the heavy Next.js API server.
import http from "http";
const PORT = process.env.PORT || 3001;
const server = http.createServer((req, res) => {
  if (req.url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", type: "worker" }));
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.listen(PORT, () => {
  logger.info(`[Workers] Health check server listening on port ${PORT}`);
});

process.on("SIGTERM", async () => {
  logger.info("[Workers] SIGTERM received — shutting down gracefully");
  await Promise.allSettled([
    dealsWorker.close(),
    emailWorker.close(),
    pushWorker.close(),
    newsletterWorker.close(),
    searchIndexWorker.close(),
    articleWorker.close(),
    toxicityWorker.close(),
    igdbWorker.close(),
    algoliaWorker.close(),
  ]);
  process.exit(0);
});

process.on("SIGINT", async () => {
  process.emit("SIGTERM" as any);
});

process.on("unhandledRejection", (reason: unknown) => {
  if (
    reason &&
    typeof reason === "object" &&
    (("code" in reason && reason.code === "ECONNRESET") ||
      ("message" in reason && typeof reason.message === "string" && reason.message.includes("ECONNRESET")))
  ) {
    // Harmless undici/fetch keep-alive socket drop, safely ignore
    return;
  }
  captureError(reason instanceof Error ? reason : new Error(String(reason)));
  logger.error({ reason }, "[Workers] Unhandled rejection");
});
