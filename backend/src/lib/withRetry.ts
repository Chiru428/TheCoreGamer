/**
 * withRetry — Retries a Prisma (or any async) operation on transient errors.
 *
 * Retried error codes:
 *   P1001 — Can't reach database server
 *   P1008 — Operations timed out
 *   P2024 — Timed out fetching a new connection from the connection pool
 *   P2034 — Transaction write conflict / deadlock
 *
 * Uses exponential back-off: 300 ms, 600 ms, 1200 ms between attempts.
 * All other errors are re-thrown immediately without retrying.
 */

const RETRYABLE_PRISMA_CODES = new Set(["P1001", "P1008", "P2024", "P2034"]);

export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const code = (err as { code?: string })?.code;
      const isRetryable = code !== undefined && RETRYABLE_PRISMA_CODES.has(code);
      if (isRetryable && i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 300 * Math.pow(2, i)));
        continue;
      }
      // Not a retryable error, or we've exhausted retries — throw immediately
      throw err;
    }
  }
  throw lastErr;
}
