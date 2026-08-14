'use client';

import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { AD_ZONES } from '@/lib/constants';

interface AdSlotProps { slot: string; className?: string; showPlaceholder?: boolean; }

// Next.js inlines `process.env.NEXT_PUBLIC_*` references statically at build time —
// dynamic lookups like `process.env[key]` are not replaced, so each zone's numeric
// AdSense slot ID must be referenced explicitly here.
const AD_SLOT_IDS: Record<string, string | undefined> = {
  'ADS-01': process.env.NEXT_PUBLIC_AD_SLOT_ADS_01,
  'ADS-02': process.env.NEXT_PUBLIC_AD_SLOT_ADS_02,
  'ADS-03': process.env.NEXT_PUBLIC_AD_SLOT_ADS_03,
  'ADS-04': process.env.NEXT_PUBLIC_AD_SLOT_ADS_04,
  'ADS-05': process.env.NEXT_PUBLIC_AD_SLOT_ADS_05,
  'ADS-06': process.env.NEXT_PUBLIC_AD_SLOT_ADS_06,
  'ADS-07': process.env.NEXT_PUBLIC_AD_SLOT_ADS_07,
  'ADS-08': process.env.NEXT_PUBLIC_AD_SLOT_ADS_08,
};

export default function AdSlot({ slot, className, showPlaceholder }: AdSlotProps) {
  const { consentGranted } = useUIStore();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const pubId = process.env.NEXT_PUBLIC_ADSENSE_ID;
  const slotId = AD_SLOT_IDS[slot];
  const zone = AD_ZONES[slot];

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '200px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Unknown zone — nothing to render
  if (!zone) return null;

  // ── STATE 1: No AdSense configured yet (pre-monetization) ──────────────────
  // Return null so no gap appears in the article body at all.
  // Once you add NEXT_PUBLIC_ADSENSE_ID + the slot env var, this gate opens.
  if (!pubId || !slotId) {
    if (!showPlaceholder) return null;
    // ── PLACEHOLDER: visible dummy ad box for layout preview ──────────────────
    return (
      <div
        ref={ref}
        className={cn('flex flex-col items-center justify-center w-full', className)}
        style={{
          maxWidth: typeof zone.width === 'number' ? `${zone.width}px` : zone.width,
          minHeight: typeof zone.height === 'number' ? `${zone.height}px` : '90px',
          margin: '0 auto',
          border: '2px dashed var(--border)',
          borderRadius: '4px',
          background: 'var(--bg2)',
          gap: '6px',
        }}
      >
        <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted3)' }}>Advertisement</span>
        <span style={{ fontSize: '11px', color: 'var(--muted3)', fontWeight: 500 }}>{zone.name} — {typeof zone.width === 'number' ? `${zone.width}×${zone.height}` : zone.format}</span>
      </div>
    );
  }

  // ── STATE 2: AdSense configured, ad not yet ready (not visible / no consent) ─
  // Reserve the exact space so the page doesn't shift when the ad renders.
  // The div is completely invisible — no background, no border, no text.
  if (!visible || !consentGranted) {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn('flex', className)}
        style={{
          maxWidth: typeof zone.width === 'number' ? `${zone.width}px` : zone.width,
          minHeight: typeof zone.height === 'number' ? `${zone.height}px` : zone.height,
          margin: '0 auto',
          background: 'transparent',
          border: 'none',
          visibility: 'hidden',
        }}
      />
    );
  }

  // ── STATE 3: Ad is ready — render the real AdSense unit ────────────────────
  return (
    <div
      ref={ref}
      className={cn('flex flex-col w-full items-center justify-center overflow-hidden', className)}
      style={{ minHeight: typeof zone.height === 'number' ? `${zone.height}px` : zone.height }}
    >
      <span style={{
        fontSize: '9px',
        fontWeight: 500,
        letterSpacing: '1px',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        marginBottom: '4px',
      }}>
        Advertisement
      </span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', maxWidth: typeof zone.width === 'number' ? `${zone.width}px` : zone.width, height: typeof zone.height === 'number' ? `${zone.height}px` : zone.height }}
        data-ad-client={pubId}
        data-ad-slot={slotId}
        data-ad-format={zone.format === 'horizontal' ? 'auto' : 'rectangle'}
        data-full-width-responsive="true"
      />
    </div>
  );
}
