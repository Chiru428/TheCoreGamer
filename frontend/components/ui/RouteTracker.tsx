'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { pageview } from '@/lib/gtag';

/**
 * Tracks page views on route changes for Google Analytics.
 * Must be placed inside a client component that re-renders on navigation.
 */
export default function RouteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Scroll to top on every route change
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    if (pathname) {
      pageview(pathname);
    }
  }, [pathname]);

  return null;
}
