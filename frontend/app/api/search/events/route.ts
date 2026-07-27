import { NextRequest, NextResponse } from 'next/server';

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;
const ALGOLIA_INSIGHTS_URL = 'https://insights.algolia.io/1/events';

/**
 * POST /api/search/events
 *
 * Proxies Algolia Insights events from the client to the Algolia Insights API.
 * Using a proxy instead of calling Algolia directly from the browser keeps
 * the API key out of XHR/network tabs and lets us add rate-limiting later.
 *
 * If Algolia is not configured (missing env vars), the request is silently
 * accepted (200) so the client-side fire-and-forget never throws.
 */
export async function POST(req: NextRequest) {
  // Silently accept if Algolia is not configured in this environment
  if (!ALGOLIA_APP_ID || !ALGOLIA_SEARCH_KEY) {
    return NextResponse.json({ status: 'ok', note: 'algolia_not_configured' });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Algolia Insights expects { events: [...] }
  const eventsPayload =
    Array.isArray((body as any)?.events)
      ? body
      : { events: [body] };

  try {
    const algoliaRes = await fetch(ALGOLIA_INSIGHTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_SEARCH_KEY,
      },
      body: JSON.stringify(eventsPayload),
    });

    if (!algoliaRes.ok) {
      const text = await algoliaRes.text();
      console.warn('[search/events] Algolia rejected event:', algoliaRes.status, text);
      // Still return 200 to the client — analytics failures must never break UX
      return NextResponse.json({ status: 'forwarded', algoliaStatus: algoliaRes.status });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('[search/events] Failed to forward to Algolia:', err);
    // Swallow the error — analytics is non-critical
    return NextResponse.json({ status: 'error_swallowed' });
  }
}
