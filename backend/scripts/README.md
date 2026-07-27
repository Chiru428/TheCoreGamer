# Developer Smoke Tests

These scripts are NOT part of the Jest test suite. They run against live APIs
and require real environment variables (DATABASE_URL, ITAD_API_KEY, etc).

## test-deals.ts
End-to-end smoke test for the deals pipeline. Runs the ITAD worker poll logic
directly without BullMQ/Redis.
Usage: npx ts-node -r tsconfig-paths/register scripts/test-deals.ts

## test-itad-api.ts
Standalone test for the IsThereAnyDeal API client.
Usage: npx ts-node -r tsconfig-paths/register scripts/test-itad-api.ts

These files are in .gitignore. Copy them from a local backup if needed.
They should never be committed as they may contain hardcoded test data.
