export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const SITE_NAME = 'TheCoreGamer';
export const SITE_DESCRIPTION = 'Your ultimate gaming destination — reviews, mod guides, news, and more.';
export const SITE_TAGLINE = 'Level up your gaming knowledge';

export interface NavLink {
  label: string;
  href: string;
  exact?: boolean;
  /** Optional dropdown entries shown on hover under the parent link */
  children?: ReadonlyArray<{ label: string; href: string }>;
  unclickable?: boolean;
}

export const NAV_LINKS: readonly NavLink[] = [
  { label: "Games", href: "/games", exact: true },
  { label: "News", href: "/news", exact: true },
  { label: "Reviews", href: "/reviews", exact: true },
  { label: "Guides", href: "/guides", exact: true },
  { label: "Opinions", href: "/opinions", exact: true },
  { label: "Core Picks", href: "/lists", exact: true },
  { label: "Deals", href: "/deals", exact: true },
] as const;

export const FOOTER_LINKS = {
  navigation: [
    { label: "Games", href: "/games", exact: true },
    { label: "Reviews", href: "/reviews", exact: true },
    { label: "News", href: "/news", exact: true },
    { label: "Opinions", href: "/opinions", exact: true },
    { label: "Lists", href: "/lists", exact: true },
    { label: "Guides", href: "/guides", exact: true },
    { label: "Deals", href: "/deals", exact: true },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'DMCA', href: '/dmca' },
    { label: 'Affiliate Disclosure', href: '/affiliate-disclosure' },
    { label: 'Review Policy', href: '/review-policy' },
    { label: 'Corrections', href: '/corrections' },
  ],
} as const;

export const SOCIAL_LINKS = [
  { label: 'Twitter', href: 'https://twitter.com/thecoregamer', icon: 'twitter' },
  { label: 'Discord', href: 'https://discord.gg/thecoregamer', icon: 'discord' },
  { label: 'YouTube', href: 'https://youtube.com/thecoregamer', icon: 'youtube' },
  { label: 'Reddit', href: 'https://reddit.com/r/thecoregamer', icon: 'reddit' },
] as const;

export const AD_ZONES: Record<string, { name: string; format: string; width: number | string; height: number | string }> = {
  'ADS-01': { name: 'Below Hero',         format: 'horizontal', width: 728, height: 'auto' },
  'ADS-02': { name: 'In-Feed 1',          format: 'horizontal', width: '100%', height: 'auto' },
  'ADS-03': { name: 'In-Feed 2',          format: 'rectangle',  width: 336, height: 280 },
  'ADS-04': { name: 'Above Comments',     format: 'horizontal', width: 728, height: 'auto' },
  'ADS-05': { name: 'Sidebar Top',        format: 'rectangle',  width: 300, height: 250 },
  'ADS-06': { name: 'Sidebar Mid',        format: 'rectangle',  width: 300, height: 250 },
  'ADS-07': { name: 'Sidebar Sticky',     format: 'vertical',   width: 300, height: 600 },
  'ADS-08': { name: 'Footer Leaderboard', format: 'horizontal', width: 728, height: 'auto' },
};

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  NEWS: 'News',
  REVIEW: 'Review',
  GUIDE: 'Guide',
  OPINION: 'Opinion',
  DEAL: 'Deal',
  LISTICLE: 'List',
};

export const CONTENT_TYPE_COLORS: Record<string, { bg: string; color: string; textColor?: string }> = {
  NEWS:       { bg: '#be123c', color: '#fff', textColor: 'var(--badge-news)' },
  REVIEW:     { bg: '#6d28d9', color: '#fff', textColor: 'var(--badge-review)' },
  GUIDE:      { bg: '#3b82f6', color: '#fff', textColor: 'var(--badge-guide)' },
  OPINION:    { bg: '#9d174d', color: '#fff', textColor: 'var(--badge-opinion)' },
  DEAL:       { bg: '#0e7490', color: '#fff', textColor: 'var(--badge-deal)' },
  LISTICLE:   { bg: '#78350f', color: '#fff', textColor: 'var(--badge-listicle)' },
};

/** Pill colors for staff roles shown on public user profiles. */
export const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  AUTHOR: { bg: '#7b5cfa', color: '#fff' },
  EDITOR: { bg: '#e85a1a', color: '#fff' },
  ADMIN: { bg: '#e11d48', color: '#fff' },
};

/** Roles that get the "Articles" tab (instead of "Reviews") in the profile modal. */
export const STAFF_ROLES = ['AUTHOR', 'EDITOR', 'ADMIN'];

export const GENRE_COLORS: Record<string, string> = {
  rpg: '#7b5cfa',
  fps: '#e85a1a',
  action: '#e11d48',
  strategy: '#0d9488',
  adventure: '#0ea5e9',
  sports: '#22c55e',
  simulation: '#8b5cf6',
  puzzle: '#e8b800',
  horror: '#6b2626',
};

export function getGenreColor(slug: string): string {
  return GENRE_COLORS[slug] || GENRE_COLORS[Object.keys(GENRE_COLORS).find(k => slug.includes(k)) || ''] || '#3b82f6';
}

export const ARTICLE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-500/20 text-gray-400' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-500/20 text-amber-400' },
  IN_REVIEW: { label: 'In Review', color: 'bg-yellow-500/20 text-yellow-400' },
  APPROVED: { label: 'Approved', color: 'bg-blue-500/20 text-blue-400' },
  PUBLISHED: { label: 'Published', color: 'bg-emerald-500/20 text-emerald-400' },
  ARCHIVED: { label: 'Archived', color: 'bg-red-500/20 text-red-400' },
};

export const EMOJI_MAP: Record<string, string> = {
  LIKE: '👍',
  FIRE: '🔥',
  AGREE: '✅',
  FUNNY: '😂',
  SURPRISED: '😲',
};

export const ITEMS_PER_PAGE = 24;

export const SCORE_BADGE_COLORS: Record<string, string> = {
  masterpiece: "#22c55e", // 9.0-10.0
  great: "#84cc16", // 8.0-8.9
  good: "#eab308", // 7.0-7.9
  average: "#f97316", // 5.0-6.9
  poor: "#ef4444", // 0.0-4.9
};

export function getScoreBadge(score: number): { label: string; color: string } {
  if (score >= 9.0) return { label: "Masterpiece", color: SCORE_BADGE_COLORS.masterpiece };
  if (score >= 8.0) return { label: "Great", color: SCORE_BADGE_COLORS.great };
  if (score >= 7.0) return { label: "Good", color: SCORE_BADGE_COLORS.good };
  if (score >= 5.0) return { label: "Average", color: SCORE_BADGE_COLORS.average };
  return { label: "Poor", color: SCORE_BADGE_COLORS.poor };
}
