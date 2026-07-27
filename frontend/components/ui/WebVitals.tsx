'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { GA_TRACKING_ID } from '@/lib/gtag';

/**
 * B7 — Reports Core Web Vitals (CLS, LCP, INP, FCP, TTFB) to GA4 as custom events.
 * Render once inside the root layout body — zero visual output.
 */
export default function WebVitals() {
  useReportWebVitals((metric) => {
    if (!GA_TRACKING_ID || typeof window === 'undefined') return;
    const gtag = (window as any).gtag;
    if (typeof gtag !== 'function') return;

    gtag('event', metric.name, {
      event_category: 'Web Vitals',
      // Round to avoid excessive decimal precision in GA4
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  });

  return null;
}
