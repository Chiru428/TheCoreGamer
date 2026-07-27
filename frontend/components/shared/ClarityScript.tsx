'use client';

import { useEffect } from 'react';
import { loadClarity, hasAnalyticsConsent } from '@/lib/clarity';
import { loadGA4 } from '@/lib/gtag';

/** Loads Clarity and GA4 after analytics consent — on mount for returning visitors, via event for new consent. */
export default function ClarityScript() {
  useEffect(() => {
    if (hasAnalyticsConsent()) {
      loadClarity();
      loadGA4();
    }

    const handleConsent = (e: Event) => {
      const detail = (e as CustomEvent<{ analytics: boolean }>).detail;
      if (detail?.analytics) {
        loadClarity();
        loadGA4();
      }
    };

    window.addEventListener('consent-updated', handleConsent);
    return () => window.removeEventListener('consent-updated', handleConsent);
  }, []);

  return null;
}
