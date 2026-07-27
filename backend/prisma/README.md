# Prisma Migrations

## Standard workflow

```bash
# Generate Prisma Client after schema changes
npm run db:generate

# Create a new migration
npm run db:migrate

# Deploy pending migrations to production
npm run db:migrate:prod

# Seed the database
npm run db:seed
```

## fix_gin_index.sql

This script lives at `prisma/fix_gin_index.sql` and should only be used as a
**manual recovery tool** when the migration `20260606200000_add_search_gin_index`
fails because the GIN index already exists (e.g. after a partial or interrupted
migration run).

Run it directly against your database:

```bash
psql "$DATABASE_URL" -f prisma/fix_gin_index.sql
```

Then re-run `prisma migrate deploy` as normal.

**Do NOT include this file in CI or the standard migration flow.**

## Node.js requirement

The `db:migrate` script uses `node --env-file`, which requires **Node.js ≥ 20.6.0**.
Check your version with `node --version` before running migrations.
