import { JSONContent } from '@tiptap/react';

export interface ValidationCheck {
  id: string;
  severity: 'error' | 'warning';
  message: string;
  detail?: string;
}

export interface PublishValidationInput {
  content: JSONContent | any;
  metaTitle: string;
  metaDesc: string;
  focusKw: string;
  featuredImageUrl: string | null;
  wordCount: number;
  contentType: string;
}

export function validateForPublish(input: PublishValidationInput): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  // --- BLOCKING ERRORS ---
  
  // Meta Title
  if (!input.metaTitle || input.metaTitle.length < 20) {
    checks.push({
      id: 'meta-title',
      severity: 'error',
      message: 'Meta title is missing or too short (min 20 chars)',
      detail: 'A strong SEO title is required for indexing.'
    });
  }

  // Featured Image — advisory warning, not a blocker
  if (!input.featuredImageUrl) {
    checks.push({
      id: 'featured-image',
      severity: 'warning',
      message: 'No featured image set',
      detail: 'Articles without a featured image get lower click-through rates in feeds and search results.'
    });
  }

  // Focus Keyword — advisory warning, not a blocker
  if (!input.focusKw) {
    checks.push({
      id: 'focus-kw',
      severity: 'warning',
      message: 'No focus keyword set',
      detail: 'Setting a focus keyword helps track SEO performance and guides on-page optimisation.'
    });
  }

  // --- WARNINGS (ADVISORY) ---

  // Meta Description
  if (!input.metaDesc || input.metaDesc.length < 100) {
    checks.push({
      id: 'meta-desc',
      severity: 'warning',
      message: 'Meta description is too short (recommended > 100 chars)',
      detail: 'A good description increases click-through rate from search results.'
    });
  }

  // Heading Structure
  if (input.wordCount > 500) {
    const headings = countHeadings(input.content);
    if (headings === 0) {
      checks.push({
        id: 'no-headings',
        severity: 'warning',
        message: 'Long article has no headings',
        detail: 'Articles over 500 words should use H2/H3 tags to improve readability.'
      });
    }
  }

  // Placeholder Text Check
  const placeholders = [
    'Game Title', 
    'Write your review summary here',
    'Write your content here…', 
    'Caption text here',
    'Hero Title', 
    'Feature 1', 
    'Option A', 
    'Option B',
    'New Metric',
    'New Requirement',
    'Step Title...'
  ];
  
  const hasPlaceholders = scanForPlaceholders(input.content, placeholders);
  if (hasPlaceholders) {
    checks.push({
      id: 'placeholder-text',
      severity: 'warning',
      message: 'Article contains template placeholder text',
      detail: 'Detected default text like "Game Title" or "Feature 1". Please replace with real content.'
    });
  }

  // Review Specific Checks
  if (input.contentType === 'REVIEW') {
    const reviewData = findReviewData(input.content);
    if (reviewData) {
      if (reviewData.score === 8.5) {
        checks.push({
          id: 'default-score',
          severity: 'warning',
          message: 'Review score is exactly 8.5 (the default)',
          detail: 'Check if this score was intentionally set or left as default.'
        });
      }
    }
  }

  return checks;
}

// --- Helper Functions ---

function countHeadings(node: any): number {
  let count = 0;
  if (!node) return 0;

  if (node.type === 'heading') {
    count++;
  }

  if (node.content && Array.isArray(node.content)) {
    node.content.forEach((child: any) => {
      count += countHeadings(child);
    });
  }

  // Handle multi-section (array of sections)
  if (Array.isArray(node)) {
    node.forEach(section => {
      count += countHeadings(section.content);
    });
  }

  return count;
}

function scanForPlaceholders(node: any, placeholders: string[]): boolean {
  if (!node) return false;

  // Check text content
  if (node.text) {
    if (placeholders.some(p => node.text.includes(p))) return true;
  }

  // Check attributes (some nodes store titles in attrs)
  if (node.attrs) {
    const attrValues = Object.values(node.attrs).join(' ');
    if (placeholders.some(p => attrValues.includes(p))) return true;
  }

  // Recurse children
  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      if (scanForPlaceholders(child, placeholders)) return true;
    }
  }

  // Handle multi-section
  if (Array.isArray(node)) {
    for (const section of node) {
      if (scanForPlaceholders(section.content, placeholders)) return true;
    }
  }

  return false;
}

function findReviewData(node: any): { score: number } | null {
  if (!node) return null;

  if (node.type === 'reviewCard') {
    return { score: node.attrs?.reviewScore || 0 };
  }

  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      const found = findReviewData(child);
      if (found) return found;
    }
  }

  if (Array.isArray(node)) {
    for (const section of node) {
      const found = findReviewData(section.content);
      if (found) return found;
    }
  }

  return null;
}

export function getWordCount(node: any): number {
  const text = extractText(node);
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  return words.length;
}

function extractText(node: any): string {
  if (!node) return '';
  let text = '';

  if (node.text) {
    text += node.text + ' ';
  }

  if (node.content && Array.isArray(node.content)) {
    node.content.forEach((child: any) => {
      text += extractText(child) + ' ';
    });
  }

  if (Array.isArray(node)) {
    node.forEach(section => {
      text += extractText(section.content) + ' ';
    });
  }

  return text;
}
