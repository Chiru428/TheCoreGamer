import * as Sentry from "@sentry/nextjs";

// -----------------------------------------------------------------------------
// Recommended Sentry alert rules (configure in the Sentry dashboard — Alerts):
//
// 1. Error rate spike
//    - Condition: number of events > 10 in 1 hour, for any issue in this project
//    - Action: send a notification to the Discord webhook integration
//
// 2. New issue in production
//    - Condition: a new issue is created, environment = production
//    - Action: send an email notification to the on-call/engineering distro
//
// 3. Slow responses (P99 latency)
//    - Condition: P99 transaction duration > 2000ms over a 5 minute window
//    - Action: send a notification to the Discord webhook integration
// -----------------------------------------------------------------------------

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    debug: false,
    ignoreErrors: [
      "read ECONNRESET",
      "ECONNRESET",
      "Connection is closed",
      "Client network socket disconnected",
    ],
  });
}

import { logger } from "@/lib/logger";

export function captureError(error: unknown, context?: Record<string, unknown>) {
  try {
    logger.error({ error }, "[Sentry]");
  } catch {
    // logger failure must not propagate out of error handlers
  }
  if (SENTRY_DSN) {
    try {
      Sentry.captureException(error, { extra: context });
    } catch {
      // Sentry failure must not propagate
    }
  }
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = "info") {
  if (SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
}

export { Sentry };
export default Sentry;
