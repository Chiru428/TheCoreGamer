export function injectUtm(url: string, store: string): string {
  try {
    const u = new URL(url);
    if (!u.searchParams.get('utm_source')) {
      u.searchParams.set('utm_source', 'thecoregamer');
      u.searchParams.set('utm_medium', 'affiliate');
      u.searchParams.set('utm_campaign', store.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
    }
    return u.toString();
  } catch {
    return url;
  }
}
