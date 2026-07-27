This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/route.ts`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## API Routes

This directory contains example API routes for the headless API app.

For more details, see [route.js file convention](https://nextjs.org/docs/app/api-reference/file-conventions/route).

## Running Workers

BullMQ workers run as an **independent process** separate from the Next.js backend. They must be started explicitly — the `npm run dev` / `npm run start` scripts do not start them.

### Development (second terminal)

```bash
npm run dev:workers
```

Runs `src/workers/index.ts` directly via `npx tsx` with hot-reload support. Keep this running alongside `npm run dev`.

### Production (PM2)

```bash
npm run workers:start    # start under PM2 supervision
npm run workers:status   # check running status
npm run workers:logs     # tail combined log output
npm run workers:restart  # rolling restart (e.g. after a deploy)
npm run workers:stop     # stop all workers
```

PM2 configuration lives in `ecosystem.config.js`. Logs are written to `logs/workers-combined.log` and `logs/workers-error.log`.

### What the workers handle

| Worker | Responsibility |
|--------|---------------|
| Deals | Hourly price poll from IsThereAnyDeal (ITAD); writes PriceSnapshot rows |
| Email | Transactional emails via Resend (welcome, password reset) |
| Push | Web push notifications via VAPID |
| Newsletter | Batch newsletter sends and weekly roundup jobs |
| SearchIndex | Keeps the `searchVector` tsvector column up to date after article saves |
| Article | Scheduled publish (embargo lift) and article status transitions |

> Workers must be running for deal alerts, email, push, newsletters, and search indexing to function. The Next.js API returns 200s without them, but the background jobs are silently queued and never processed.

## Observability

- **Sentry** — error tracking, enabled by setting `SENTRY_DSN`. Captures exceptions from both the Next.js API and the BullMQ workers (see `src/lib/sentry.ts`).
- **Pino** — structured JSON logging via `src/lib/logger.ts`. Pretty-printed in development (`pino-pretty`), JSON in production for log aggregation.
- **OpenTelemetry** — distributed tracing across the three-tier stack (API, workers, database), opt-in via `OTEL_ENABLED=true`. Initialized in `src/lib/tracing.ts` using `@opentelemetry/sdk-node` with auto-instrumentation plus `@prisma/instrumentation` for query-level spans. Configure `OTEL_SERVICE_NAME` and `OTEL_EXPORTER_OTLP_ENDPOINT` to export to Jaeger, Zipkin, or any OTLP-compatible backend. See `.env.example` for the full set of variables.

## Production Deployment

### GIN Index for Full-Text Search

Migration `20260606200000_add_search_gin_index` creates a GIN index on
`Article.searchVector` using `CREATE INDEX CONCURRENTLY`. The `CONCURRENTLY`
keyword **cannot run inside a transaction**, but `prisma migrate deploy` wraps
every migration in a transaction. Running this migration through Prisma will
therefore fail on production.

**Before running `prisma migrate deploy` in production:**

1. Apply the GIN index manually via psql or the Supabase SQL editor:

   ```sql
   CREATE INDEX CONCURRENTLY IF NOT EXISTS "article_search_gin_idx"
     ON "Article" USING gin("searchVector");
   ```

2. Mark the migration as already applied so Prisma does not try to re-run it:

   ```bash
   npx prisma migrate resolve --applied 20260606200000_add_search_gin_index
   ```

3. Then run the remaining migrations as normal:

   ```bash
   npx prisma migrate deploy
   ```

The index build is non-blocking (no table lock) but may take several minutes on
a large `Article` table. Monitor progress in `pg_stat_progress_create_index`.

## Development Notes

Do not commit debug scripts (check_*.js, debug_*.js, fetch-article.ts) to the repo.
Use the .gitignore patterns above. For local debugging, create files prefixed with
'local.' which are gitignored.
