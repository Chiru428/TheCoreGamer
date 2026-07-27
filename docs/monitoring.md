# Monitoring & Alerting

This document covers external uptime monitoring for TheCoreGamer. For application
error tracking and performance alerting, see the Sentry alert rules documented in
`backend/src/lib/sentry.ts`.

## Uptime monitors (Better Uptime / Checkly)

Configure the following HTTP checks, each polling every **60 seconds**. Replace
`<SITE_URL>` with the production value of the `SITE_URL` env var (the public
frontend origin).

| Check | URL | Expected | Notes |
| --- | --- | --- | --- |
| Homepage | `<SITE_URL>/` | `200 OK` | Confirms the frontend is serving traffic. |
| Backend health | `<SITE_URL>/api/health` | `200 OK`, JSON `status: "ok"` | Checks Prisma DB and Redis connectivity (see PART D below). Must respond in < 500ms. |
| Admin redirect | `<SITE_URL>/admin` | `3xx` redirect (to login) for unauthenticated requests | Verifies the admin app is reachable without exposing dashboard data — do not expect a `200`. |

### Setup steps

1. Create a new **Heartbeat group** (or "Monitor group") named `theCoreGamer`.
2. Add the three checks above as HTTP monitors with a 60s check interval and a
   short timeout (5-10s) so transient blips don't cause false positives.
3. For `/api/health`, add an assertion on the JSON body: `status == "ok"`.
   Optionally assert `db == true` and `cache == true` if you want the monitor
   itself to fail when either dependency is down (rather than relying on the
   `degraded`/`critical` status surfaced in the admin dashboard).
4. Set the response time threshold for `/api/health` to 500ms — alert if
   exceeded for 2+ consecutive checks.

## Alerting via Discord

1. In Discord, create a webhook for the channel that should receive uptime
   alerts (Server Settings → Integrations → Webhooks → New Webhook → Copy
   Webhook URL).
2. In Better Uptime / Checkly, add a new **Discord** alert integration and
   paste the webhook URL.
3. Attach the integration to each of the three monitors above so that:
   - The monitor goes down → Discord message posted immediately.
   - The monitor recovers → Discord message posted on recovery.
4. Recommended escalation: if a monitor is down for more than 5 minutes,
   escalate (e.g. SMS/phone) in addition to the Discord ping.

## Related

- **BullMQ worker health**: `GET /api/admin/workers/health` (admin-only) reports
  per-queue job counts and an overall `healthy` / `degraded` / `critical`
  status, surfaced on the admin dashboard. This is for internal visibility and
  is not part of the external uptime checks above.
- **Sentry alert rules**: documented in `backend/src/lib/sentry.ts` — covers
  error rate spikes, new production issues, and slow (P99) responses.
