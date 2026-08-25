import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes with clsx */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function getGuideTypeColor(str: string | null | undefined): string {
  if (!str) return 'var(--guide-color-0)';
  const hash = str.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const index = Math.abs(hash) % 10;
  return `var(--guide-color-${index})`;
}

/** Format a date string to a readable format */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Format a date string to a readable format with time */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Format date relative (e.g., "2 hours ago") */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

/** Mask an IP address (or anonymized CIDR range) down to its first two octets/groups for display */
export function maskIpDisplay(ip: string): string {
  if (!ip) return '';
  return ip;
}

/** Truncate text to a max length */
export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len).trimEnd() + '…';
}

/** Estimate reading time from TipTap JSON content */
export function readingTime(content: unknown): number {
  const text = extractText(content);
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** Count words from TipTap JSON content */
export function wordCount(content: unknown): number {
  const text = extractText(content);
  return text.split(/\s+/).filter(Boolean).length;
}

/** Extract plain text from TipTap JSON recursively */
export function extractText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';

  // Handle mod-guide sections array: [{ title, content: TipTapDoc }, ...]
  if (Array.isArray(node)) {
    return (node as unknown[]).map((section: unknown) => {
      if (!section || typeof section !== 'object') return '';
      const s = section as Record<string, unknown>;
      const titleText = typeof s.title === 'string' ? s.title : '';
      const bodyText = s.content ? extractText(s.content) : '';
      return [titleText, bodyText].filter(Boolean).join(' ');
    }).join(' ');
  }

  const n = node as Record<string, unknown>;
  if (n.type === 'text' && typeof n.text === 'string') return n.text;
  if (Array.isArray(n.content)) {
    return (n.content as unknown[]).map(extractText).join(' ');
  }
  return '';
}

/** Generate a URL-friendly slug */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/** Get initials from a name */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Format number to compact form (e.g., 1.2K) */
export function formatNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined || num === '') return '0';
  const parsedNum = Number(num);
  if (isNaN(parsedNum)) return '0';
  if (parsedNum >= 1_000_000) return `${(parsedNum / 1_000_000).toFixed(1)}M`;
  if (parsedNum >= 1_000) return `${(parsedNum / 1_000).toFixed(1)}K`;
  return parsedNum.toString();
}

/** Format file size in bytes to human readable */
export function formatFileSize(bytes: number | string): string {
  const parsedBytes = Number(bytes);
  if (isNaN(parsedBytes)) return '0 B';
  if (parsedBytes < 1024) return `${parsedBytes} B`;
  if (parsedBytes < 1024 * 1024) return `${(parsedBytes / 1024).toFixed(1)} KB`;
  if (parsedBytes < 1024 * 1024 * 1024) return `${(parsedBytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(parsedBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Get score color based on review score — one shade per score-label tier */
export function getScoreColor(score: number): string {
  if (score >= 10) return '#a855f7'; // Masterpiece — purple
  if (score >= 9) return '#14b8a6'; // Excellent — teal
  if (score >= 8) return '#22c55e'; // Great — green
  if (score >= 7) return '#3b82f6'; // Good — blue
  if (score >= 6) return '#84cc16'; // Fair — lime
  if (score >= 5) return '#eab308'; // Average — yellow
  if (score >= 4) return '#f59e0b'; // Unimpressive — amber
  if (score >= 3) return '#f97316'; // Bad — orange
  if (score >= 2) return '#ef4444'; // Terrible — red
  return '#b91c1c'; // Unplayable — dark red
}

/** Get score label based on review score */
export function getScoreLabel(score: number): string {
  if (score >= 10) return 'Masterpiece';
  if (score >= 9) return 'Excellent';
  if (score >= 8) return 'Great';
  if (score >= 7) return 'Good';
  if (score >= 6) return 'Fair';
  if (score >= 5) return 'Average';
  if (score >= 4) return 'Unimpressive';
  if (score >= 3) return 'Bad';
  if (score >= 2) return 'Terrible';
  return 'Unplayable';
}

/** Get difficulty display */
export function getDifficultyDisplay(diff: string): { label: string; color: string } {
  switch (diff) {
    case 'EASY': return { label: 'Easy', color: 'bg-emerald-500/20 text-emerald-400' };
    case 'INTERMEDIATE': return { label: 'Intermediate', color: 'bg-yellow-500/20 text-yellow-400' };
    case 'ADVANCED': return { label: 'Advanced', color: 'bg-red-500/20 text-red-400' };
    default: return { label: diff, color: 'bg-gray-500/20 text-gray-400' };
  }
}

/** Get tag color variant based on string hash */
export function getTagColorVariant(tagStr: string): 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' {
  if (!tagStr) return 'default';
  const variants = ['success', 'warning', 'danger', 'info', 'purple'] as const;
  let hash = 0;
  for (let i = 0; i < tagStr.length; i++) {
    hash = tagStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return variants[Math.abs(hash) % variants.length];
}
