# TheCoreGamer — Setup Guide

## Prerequisites
- Node.js 20+
- PostgreSQL database (Supabase recommended)
- Redis (Upstash recommended for serverless, or local Redis for dev)

---

## Quick Start

### 1. Set up environment variables

**Frontend:**
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local — at minimum set AUTH_SECRET
```

**Backend:**
```bash
cd backend
cp .env.example .env.local
# Edit .env.local — set DATABASE_URL, AUTH_SECRET, REDIS_URL
```

> ⚠️ **Critical:** `AUTH_SECRET` must be the **exact same value** in both `frontend/.env.local` and `backend/.env.local`. Generate one with:
> ```bash
> openssl rand -base64 32
> ```

### 2. Install dependencies

```bash
cd frontend && npm install
cd ../backend && npm install
```

### 3. Set up the database

```bash
cd backend
npx prisma migrate deploy
npx prisma db seed   # optional — seeds demo content
```

### 4. Run in development

Open two terminals:

```bash
# Terminal 1 — Backend (port 3001)
cd backend && npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend && npm run dev
```

Open http://localhost:3000

---

## Environment Variables Reference

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | ✅ | JWT signing secret — must match backend |
| `NEXTAUTH_URL` | ✅ | Frontend public URL (e.g. `http://localhost:3000`) |
| `BACKEND_URL` | ✅ | Backend URL for server-side calls (e.g. `http://localhost:3001`) |
| `NEXT_PUBLIC_API_URL` | ✅ | Backend URL for browser-side calls |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth |
| `DISCORD_CLIENT_ID` | Optional | Discord OAuth |
| `DISCORD_CLIENT_SECRET` | Optional | Discord OAuth |

### Backend (`backend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | ✅ | JWT signing secret — must match frontend |
| `DATABASE_URL` | ✅ | PostgreSQL connection string (via pgBouncer) |
| `DIRECT_URL` | ✅ | Direct PostgreSQL URL (for migrations) |
| `REDIS_URL` | ✅ | Redis connection URL (BullMQ workers) |
| `NEXTAUTH_URL` | ✅ | Frontend public URL |
| `REVALIDATE_SECRET` | ✅ | Separate secret for on-demand ISR revalidation — min 32 chars |
| `ADMIN_IP_ENFORCE` | Optional | Set to `"true"` to enforce admin IP allowlist on `/api/admin/*` (default: `false`) |
| `ADMIN_IP_ALLOWLIST` | Optional | Comma-separated IPs permitted to reach `/api/admin/*` when enforcement is on (default: `127.0.0.1,::1`) |
| `NEXT_PUBLIC_R2_HOST` | Optional | Cloudflare R2 CDN hostname **without** protocol — used by Next.js Image and media URLs (e.g. `files.thecoregamer.com`) |
| `SITE_URL` | Optional | Public site URL used to build full URLs for Cloudflare cache purges (default: `http://localhost:3000`) |
| `CLOUDFLARE_ACCOUNT_ID` | Optional | Cloudflare account ID |
| `CLOUDFLARE_ZONE_ID` | Optional | Cloudflare zone ID for the production domain — required for cache purging |
| `CLOUDFLARE_API_TOKEN` | Optional | Cloudflare API token with **Zone.Cache Purge** permission for the zone above |

---

## Common Errors

### `MissingSecret` / `ClientFetchError`
→ `AUTH_SECRET` is not set in `frontend/.env.local`. Copy `.env.example` and set it.

### `ERR_NAME_NOT_RESOLVED` on `/api/auth/session`
→ `BACKEND_URL` is wrong or the backend isn't running. Check both servers are up.

### `Internal Server Error` on login
→ Backend `DATABASE_URL` is incorrect or the database isn't running.

---

## AdSense / `ads.txt`

Google AdSense crawlers only read `ads.txt` from the **apex (root) domain** —
e.g. `https://thecoregamer.com/ads.txt`. A copy served from an API or backend
subdomain (such as `https://api.thecoregamer.com/ads.txt`) will **not** be
picked up and AdSense will report the site as missing `ads.txt`.

The canonical route lives at [`frontend/app/ads.txt/route.ts`](frontend/app/ads.txt/route.ts)
and is served at the frontend's root, since that's what's deployed on the apex
domain. It derives the publisher ID from `NEXT_PUBLIC_ADSENSE_ID`. The
`backend/src/app/api/ads.txt/route.ts` copy exists for completeness but should
**not** be relied on for AdSense verification — only the frontend route at the
apex domain counts.

When deploying, double-check that `https://<your-apex-domain>/ads.txt` resolves
to the frontend app's response (not a redirect to a subdomain), or AdSense
verification will fail.

---

## Cloudflare Cache Rules

The frontend sets `Cache-Control`/`Surrogate-Control` response headers (see
`frontend/next.config.ts` → `headers()`), and the backend actively purges
Cloudflare's cache on article publish/update via
[`backend/src/lib/cloudflare.ts`](backend/src/lib/cloudflare.ts). For this to
work end-to-end, Cloudflare must be configured (in the dashboard) to **respect
origin cache headers** on the routes below rather than overriding them with
its own defaults.

> ℹ️ This section is documentation only — no Cloudflare dashboard settings
> have been changed. Apply these as **Cache Rules** under
> *Caching → Cache Rules* in the Cloudflare dashboard.

### Paths to cache (respect origin headers)

These routes return `Cache-Control: public, s-maxage=300, stale-while-revalidate=60`
and `Surrogate-Control: max-age=300`. Create a Cache Rule matching:

```
/articles/*
/reviews/*
/news/*
/mod-guides/*
/walkthroughs/*
/games/*
/platforms/*
/genres/*
/esports/*
/franchises/*
```

Cache eligibility: **Eligible for cache**, with "Cache by origin headers" (or
equivalent "Respect Existing Headers") so the 5-minute `s-maxage` from the
origin is honored. Edge TTL can be left to origin headers.

### Paths to bypass (never cache)

These routes return `Cache-Control: no-store` (API) or
`Cache-Control: no-store, no-cache` (authenticated/admin pages). Create a
Cache Rule matching:

```
/api/*
/settings/*
/admin/*
/dashboard/*
/notifications/*
```

Cache eligibility: **Bypass cache**.

### Purge on publish

When an article is published, updated, or revalidated via
`POST /api/revalidate`, the backend calls `purgeCloudflareCache()` to purge:

- `${SITE_URL}/articles/<slug>` (or `/reviews/<slug>`, `/mod-guides/<slug>`, etc.)
- `${SITE_URL}/news`
- `${SITE_URL}/`
- `${SITE_URL}/sitemap.xml`

This requires `CLOUDFLARE_ZONE_ID` and `CLOUDFLARE_API_TOKEN` to be set (see
Environment Variables Reference above). If either is missing, purging is
skipped and a warning is logged — the site still works, but Cloudflare may
continue serving stale pages for up to `s-maxage` (5 minutes) after a publish.
