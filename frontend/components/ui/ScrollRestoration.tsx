'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * ScrollRestoration — saves and restores window scroll position on page reload.
 *
 * Uses sessionStorage keyed by pathname so each page has its own saved position.
 * sessionStorage (not localStorage) is intentional: position resets on new tabs
 * but survives a browser refresh — exactly the expected UX.
 *
 * Usage: render once inside your layout, e.g. <ScrollRestoration />
 */
export default function ScrollRestoration() {
  const pathname = usePathname();
  const storageKey = `scroll:${pathname}`;
  const isRestoring = useRef(false);

  // Restore scroll position on mount / pathname change
  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (!saved) return;

    const y = parseInt(saved, 10);
    if (!Number.isFinite(y) || y <= 0) return;

    // Use requestAnimationFrame to wait for the page to fully render
    // before scrolling — avoids jumping back to 0 immediately after restore.
    isRestoring.current = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: y, behavior: 'instant' });
        isRestoring.current = false;
      });
    });
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save scroll position on every scroll event (throttled via requestAnimationFrame)
  useEffect(() => {
    let rafId: number | null = null;

    const handleScroll = () => {
      if (isRestoring.current) return; // don't overwrite during restore
      if (rafId !== null) return;

      rafId = requestAnimationFrame(() => {
        sessionStorage.setItem(storageKey, String(Math.round(window.scrollY)));
        rafId = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [storageKey]);

  return null;
}
