// Rate limit tiers (requests per window per IP)
export const RATE_LIMITS = {
  READ: { requests: 100, window: 60 },
  WRITE: { requests: 20, window: 60 },
  AUTH: { requests: 10, window: 60 },
  TENOR: { requests: 30, window: 60 },
  OEMBED: { requests: 60, window: 3600 },
  REGISTER: { requests: 5, window: 3600 },
  LOGIN: { requests: 10, window: 3600 },
  SEARCH: { requests: 120, window: 3600 },
} as const;

// Per-user rate limit tiers (requests per window per user)
export const USER_RATE_LIMITS = {
  AI_STANDARD: { requests: 20, window: 3600 },
  AI_REWRITE: { requests: 10, window: 3600 },
} as const;

// Pagination
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// File uploads
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
];
export const BLOCKED_EXTENSIONS = [".exe", ".bat", ".cmd", ".sh", ".ps1", ".msi", ".dll"];

// Srcset widths
export const SRCSET_WIDTHS = [320, 640, 960, 1280, 1920] as const;

// Review score badge colors
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

// Stop words for slug generation
export const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "of",
  "in",
  "on",
  "at",
  "to",
  "and",
  "or",
  "but",
  "for",
  "with",
  "by",
  "from",
  "as",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "out",
  "off",
  "over",
  "under",
]);

// Comment toxicity threshold
export const TOXICITY_THRESHOLD = 0.7;
export const COMMENTS_PER_HOUR_LIMIT = 20;

// Cache TTLs (seconds)
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  LISTING: 180, // 3 minutes — paginated content lists (e.g. homepage article feed)
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  HOUR: 3600, // 1 hour
  DAY: 86400, // 24 hours
} as const;

// Ad placement zones
export const AD_ZONES = [
  "ADS-01",
  "ADS-02",
  "ADS-03",
  "ADS-04",
  "ADS-05",
  "ADS-06",
  "ADS-07",
  "ADS-08",
] as const;
