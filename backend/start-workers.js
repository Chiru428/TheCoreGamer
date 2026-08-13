// Production worker entry point
// Env vars are injected by the host (Render / Fly.io / etc.) — no .env file needed
require('child_process').execSync('npx tsx src/workers/index.ts', { stdio: 'inherit' });
