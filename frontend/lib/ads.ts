/**
 * True only when AdSense can actually render something: the publisher ID is set
 * AND at least one per-slot ID is set. Gate ad wrapper markup (borders, min-height)
 * on this so pages don't show empty ad boxes before slots exist.
 *
 * Each env var is referenced statically so Next.js inlines it at build time.
 */
export const ADS_LIVE =
  !!process.env.NEXT_PUBLIC_ADSENSE_ID &&
  [
    process.env.NEXT_PUBLIC_AD_SLOT_ADS_01,
    process.env.NEXT_PUBLIC_AD_SLOT_ADS_02,
    process.env.NEXT_PUBLIC_AD_SLOT_ADS_03,
    process.env.NEXT_PUBLIC_AD_SLOT_ADS_04,
    process.env.NEXT_PUBLIC_AD_SLOT_ADS_05,
    process.env.NEXT_PUBLIC_AD_SLOT_ADS_06,
    process.env.NEXT_PUBLIC_AD_SLOT_ADS_07,
    process.env.NEXT_PUBLIC_AD_SLOT_ADS_08,
  ].some(Boolean);
