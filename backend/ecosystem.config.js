// PM2 ecosystem configuration for TheCoreGamer background workers
// Start with: pm2 start ecosystem.config.js
// Monitor with: pm2 monit
// View logs with: pm2 logs thecoregamer-workers

module.exports = {
  apps: [
    // ── Next.js API server ─────────────────────────────────────────────────
    // Requires `npm run build` first. Listens on port 3001.
    {
      name: 'thecoregamer-backend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: process.cwd(),
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3001,
      },
      log_file: 'logs/backend-combined.log',
      error_file: 'logs/backend-error.log',
      merge_logs: true,
      time: true,
    },

    // ── Background workers ─────────────────────────────────────────────────
    {
      name: 'thecoregamer-workers',

      // Invoke tsx directly from node_modules so PM2 doesn't need a global
      // installation. This replaces the old start-workers.js wrapper that was
      // running `npm run dev:workers` via execSync — that chain failed because
      // npm resolved tsx as a local package import (ERR_MODULE_NOT_FOUND).
      script: 'node_modules/.bin/tsx',
      args: 'src/workers/index.ts',
      interpreter: 'none', // tsx is already an executable; don't wrap in node

      // Do not watch filesystem — workers are long-running processes
      watch: false,

      // Restart policy
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000, // ms — wait 5 s between restart attempts

      // Environment
      env: {
        NODE_ENV: 'production',
      },

      // Logging
      log_file: 'logs/workers-combined.log',
      error_file: 'logs/workers-error.log',
      merge_logs: true,
      time: true, // prefix log lines with timestamps
    },
  ],
};

// NOTE: A separate process manager entry is needed for the Next.js API server.
// In production, start it with: next start -p 3001
// Add it to PM2 with something like:
//   pm2 start "next start -p 3001" --name thecoregamer-backend --cwd /path/to/backend
// Or use a Dockerfile / systemd unit — see the deployment docs.
