const CACHE_NAME = 'tcg-v2';
const STATIC_ASSETS = ['/', '/offline', '/manifest.json'];
const STATIC_ASSET_RE = /\.(jpg|jpeg|png|webp|avif|gif|svg|woff2?)$/;
const ARTICLE_PATH_RE = /^\/(articles|reviews|mod-guides)\//;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Install: pre-cache the shell and offline page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function putInCache(request, response) {
  if (request.method !== 'GET') return response;
  if (response.ok) {
    const responseToCache = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
  }
  return response;
}

function isFresh(cached) {
  const cachedAt = cached.headers.get('sw-cached-at');
  if (!cachedAt) return true;
  return Date.now() - Number(cachedAt) < SEVEN_DAYS_MS;
}

async function cacheFirstWithTTL(request) {
  const cached = await caches.match(request);
  if (cached && isFresh(cached)) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const stamped = new Response(await response.clone().blob(), {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers),
      });
      stamped.headers.append('sw-cached-at', String(Date.now()));
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, stamped.clone());
      return response;
    }
    return cached || response;
  } catch {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const networkFetch = fetch(request)
    .then((response) => putInCache(request, response))
    .catch(() => cached);
  return cached || networkFetch;
}

// Fetch strategy:
// - Navigation requests: network-first, fall back to /offline
// - Article pages (/articles/*, /reviews/*, /mod-guides/*): stale-while-revalidate
// - API requests: network-only (never cache)
// - Static assets (images, fonts): cache-first with 7-day TTL
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CRITICAL: Never intercept cross-origin requests.
  // SW fetch() calls are governed by connect-src CSP, not img-src.
  // Cross-origin images/assets have their own CDN caching — do not proxy them.
  if (url.origin !== self.location.origin) {
    return; // do NOT call event.respondWith() — let browser handle natively
  }

  if (event.request.method !== 'GET') {
    return; // Cache API only supports GET requests
  }

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) {
    return; // Network-only for API and Next.js internal assets/HMR
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          putInCache(event.request, response);
          return response;
        })
        .catch(async () => {
          const offline = await caches.match('/offline');
          const cached = await caches.match(event.request);
          return offline || cached || Response.error();
        })
    );
    return;
  }

  if (ARTICLE_PATH_RE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  if (STATIC_ASSET_RE.test(url.pathname)) {
    event.respondWith(cacheFirstWithTTL(event.request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request));
});

// Push notifications (already wired to BullMQ push worker)
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'TheCoreGamer', {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      data: { url: data.url ?? '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url));
});
