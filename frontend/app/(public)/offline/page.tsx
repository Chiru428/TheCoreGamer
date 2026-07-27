'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WifiOff, RefreshCw } from 'lucide-react';

const ARTICLE_PATH_RE = /^\/(articles|reviews|mod-guides)\/[^/]+$/;

interface CachedArticle {
  url: string;
  path: string;
}

export default function OfflinePage() {
  const [cachedArticles, setCachedArticles] = useState<CachedArticle[]>([]);

  useEffect(() => {
    if (typeof caches === 'undefined') return;
    let cancelled = false;

    caches.open('tcg-v2').then(async (cache) => {
      const requests = await cache.keys();
      const articles = requests
        .map((req) => new URL(req.url))
        .filter((url) => ARTICLE_PATH_RE.test(url.pathname))
        .map((url) => ({ url: url.href, path: url.pathname }));
      if (!cancelled) setCachedArticles(articles);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <WifiOff className="w-12 h-12 text-text-dim mx-auto mb-4" aria-hidden />
      <h1 className="text-2xl font-bold text-text-primary mb-2">You&apos;re offline</h1>
      <p className="text-sm text-text-muted mb-6">
        Check your internet connection and try again.
      </p>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:brightness-110 transition"
      >
        <RefreshCw className="w-4 h-4" />
        Try again
      </button>

      {cachedArticles.length > 0 && (
        <div className="mt-12 text-left">
          <h2 className="text-sm font-semibold text-text-dim uppercase tracking-wide mb-3">
            Available offline
          </h2>
          <ul className="space-y-2">
            {cachedArticles.map((article) => (
              <li key={article.url}>
                <Link
                  href={article.path}
                  className="block px-4 py-3 rounded-lg bg-bg-surface border border-border text-sm text-text-primary hover:bg-bg-elevated transition-colors truncate"
                >
                  {article.path}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
