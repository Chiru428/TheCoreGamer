/**
 * Shared DOMPurify configuration — used by BOTH the editor and frontend renderer.
 * Single source of truth for HTML sanitization across the entire CMS.
 */

import DOMPurify, { Config } from 'dompurify';

// CSS properties allowed on ANY element via inline style.
const ALLOWED_STYLE_PROPS = new Set([
  'color', 'background-color', 'background',
  'font-size', 'font-family', 'font-weight', 'font-style', 'font-variant',
  'text-align', 'text-decoration', 'text-transform', 'text-shadow',
  'line-height', 'letter-spacing', 'word-spacing',
  // Indentation — editor stores these via margin-left on paragraph/heading nodes
  'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
  'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
  // Layout
  'display', 'flex', 'flex-direction', 'flex-wrap', 'align-items', 'justify-content',
  'gap', 'width', 'max-width', 'min-width', 'height', 'max-height',
  'border', 'border-left', 'border-right', 'border-top', 'border-bottom', 'border-radius',
  'opacity', 'overflow', 'overflow-x', 'overflow-y',
  'white-space', 'word-break', 'overflow-wrap',
  'grid-template-columns', 'grid-template-rows', 'grid-gap',
  // CSS variable definitions (--color-light etc used by theme colors)
  '--color-light', '--color-dark',
]);

// CSS properties that must NOT appear on inline elements (span, a, strong, em…).
// `border` on an inline span triggers a border-box in the browser's inline
// formatting context and shifts line-box height, creating phantom vertical gaps
// — even when the value is "0px solid" / "none".
// `margin` / `padding` on inline spans are also ignored by browsers but can
// interfere with line-box calculation in some rendering paths.
const BLOCK_ONLY_STYLE_PROPS = new Set([
  'border', 'border-left', 'border-right', 'border-top', 'border-bottom',
  'border-radius',
  'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
  'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
  'display', 'width', 'max-width', 'min-width', 'height', 'max-height',
  'overflow', 'overflow-x', 'overflow-y',
]);

// HTML tags that are considered inline — these get the extra BLOCK_ONLY strip.
const INLINE_TAGS = new Set([
  'SPAN', 'A', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE', 'DEL', 'INS',
  'SUP', 'SUB', 'MARK', 'CODE', 'KBD', 'SAMP', 'CITE', 'Q',
]);

export const DOMPURIFY_CONFIG: Config = {
  ADD_TAGS: [
    // Standard inline/block
    'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'ins',
    'sup', 'sub', 'mark', 'code', 'pre', 'kbd', 'samp',
    'blockquote', 'cite', 'q',
    'a', 'img',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
    'figure', 'figcaption',
    // Layout — needed for gaming content blocks
    'div', 'span', 'section', 'article', 'aside', 'header', 'footer',
    // Details/summary
    'details', 'summary',
    // Media
    'iframe', 'video', 'source',
    // Interactive
    'button', 'input',
  ],
  ADD_ATTR: [
    'class', 'style', 'id',
    'data-type', 'data-id', 'data-score', 'data-platform', 'data-version',
    'data-label', 'data-variant', 'data-tab', 'data-panel', 'data-ad',
    'data-light', 'data-dark', 'data-bullet',
    // Links / media
    'href', 'src', 'alt', 'title', 'target', 'rel',
    'width', 'height', 'loading', 'decoding',
    // Table
    'colspan', 'rowspan', 'scope',
    // iframe (YouTube/Twitch embeds)
    'frameborder', 'allowfullscreen', 'allow',
    // Details/summary
    'open',
    // Form elements (task-list checkboxes)
    'type', 'checked',
  ],
  ALLOW_DATA_ATTR: true,
  FORCE_BODY: false,
};

// Hook 1: CSS property filter.
// - On block elements: allow everything in ALLOWED_STYLE_PROPS.
// - On inline elements: additionally strip BLOCK_ONLY_STYLE_PROPS so that
//   `border: 0px solid` / `margin: 0px` / `padding: 0px` on <span> tags
//   cannot perturb inline line-box height and create phantom vertical gaps.
if (typeof window !== 'undefined') {
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    if (data.attrName !== 'style') return;
    const el = node as HTMLElement;
    const rawStyle = data.attrValue;
    if (!rawStyle) return;

    const isInline = INLINE_TAGS.has(el.tagName);

    const filtered = rawStyle
      .split(';')
      .map(rule => rule.trim())
      .filter(rule => {
        if (!rule) return false;
        const colonIdx = rule.indexOf(':');
        if (colonIdx === -1) return false;
        const prop = rule.slice(0, colonIdx).trim().toLowerCase();
        // Always allow CSS custom properties (--)
        if (prop.startsWith('--')) return true;
        // Reject properties not in the global allowlist
        if (!ALLOWED_STYLE_PROPS.has(prop)) return false;
        // For inline elements, additionally reject block-only properties
        if (isInline && BLOCK_ONLY_STYLE_PROPS.has(prop)) return false;
        return true;
      })
      .join('; ');

    if (filtered) {
      data.attrValue = filtered;
    } else {
      data.forceKeepAttr = false;
    }
  });
}

// Hook 2: Restore CSS variables on custom color spans which get stripped by default.
if (typeof window !== 'undefined') {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (
      node.tagName === 'SPAN' &&
      node.classList.contains('theme-color-custom')
    ) {
      const lightMatch = node.getAttribute('data-light');
      const darkMatch = node.getAttribute('data-dark');
      if (lightMatch) (node as HTMLElement).style.setProperty('--color-light', lightMatch);
      if (darkMatch) (node as HTMLElement).style.setProperty('--color-dark', darkMatch);
      (node as HTMLElement).style.color = 'var(--color-light)';
    }
  });
}

/**
 * Sanitize HTML string using DOMPurify with gaming CMS config.
 * Safe for use with dangerouslySetInnerHTML — strips XSS vectors
 * while preserving gaming layout classes, inline styles, and data attributes.
 *
 * Also normalises phantom empty paragraphs that ProseMirror produces when
 * `preserveWhitespace: 'full'` causes formatting newlines between tags to be
 * wrapped in <p> nodes.
 */
export function sanitizeHTML(html: string): string {
  if (typeof window === 'undefined') return html; // SSR guard
  let cleaned = DOMPurify.sanitize(html, DOMPURIFY_CONFIG) as string;

  // Pass 1: Normalise paragraphs that contain ONLY whitespace, &nbsp;, &#160;,
  // unicode non-breaking spaces (\u00a0), zero-width spaces (\u200b), or <br>
  // tags — these are ProseMirror whitespace-wrapping artefacts.
  cleaned = cleaned.replace(
    /<p[^>]*>(?:\s|&nbsp;|&#160;|\u00a0|\u200b|<br\s*\/?>)*<\/p>/gi,
    '<p></p>',
  );

  // Pass 2: Collapse runs of 2+ consecutive empty paragraphs (optionally
  // separated by whitespace or HTML comments) down to a single empty paragraph.
  cleaned = cleaned.replace(
    /(?:<p><\/p>\s*(?:<!--.*?-->\s*)?){2,}/gi,
    '<p></p>',
  );

  // Pass 3: Strip empty <p></p> that are the sole child of a <li>.
  cleaned = cleaned.replace(/<li([^>]*)>\s*<p><\/p>\s*<\/li>/gi, '<li$1></li>');

  // Pass 4: Drop empty <p></p> immediately before/after block-level gaming
  // content elements that manage their own margins.
  cleaned = cleaned.replace(
    /(<\/(?:blockquote|div|details|figure|ul|ol)>)\s*<p><\/p>/gi,
    '$1',
  );
  cleaned = cleaned.replace(
    /<p><\/p>\s*(<(?:blockquote|div|details|figure|ul|ol)[^>]*>)/gi,
    '$1',
  );

  return cleaned;
}

/**
 * Flatten redundant nested spans that carry identical class/style info.
 *
 * TipTap's getHTML() emits 6-8 nested <span> wrappers per word when multiple
 * marks (textStyle, color, fontSize) are applied simultaneously. When this HTML
 * is re-pasted via the HTML source editor, TipTap re-parses it and stores a
 * deeply nested JSON tree — ballooning the DB payload to 2-3MB per article.
 *
 * This collapses single-child span chains into one representative span,
 * reducing payload size by 70-90% while preserving all visual styling.
 * Call this in handleApplyHtmlSource BEFORE setContent().
 */
export function flattenRedundantSpans(html: string): string {
  if (typeof window === 'undefined') return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');

  function mergeSpan(el: Element): void {
    Array.from(el.children).forEach(mergeSpan); // bottom-up

    if (el.tagName !== 'SPAN') return;

    // Collapse single-child span chains
    while (
      el.children.length === 1 &&
      el.children[0].tagName === 'SPAN' &&
      el.childNodes.length === 1
    ) {
      const child = el.children[0] as HTMLElement;
      const parentEl = el as HTMLElement;

      // Merge classes (dedup)
      child.classList.forEach(c => parentEl.classList.add(c));

      // Merge inline styles (child wins on conflict)
      const childStyle = child.getAttribute('style') || '';
      if (childStyle) {
        childStyle.split(';').forEach(rule => {
          const [prop, val] = rule.split(':').map(s => s.trim());
          if (prop && val) parentEl.style.setProperty(prop, val);
        });
      }

      // Merge data-* attributes
      Array.from(child.attributes).forEach(attr => {
        if (attr.name.startsWith('data-') && !el.hasAttribute(attr.name)) {
          el.setAttribute(attr.name, attr.value);
        }
      });

      // Hoist grandchildren
      while (child.firstChild) el.insertBefore(child.firstChild, child);
      child.remove();
    }
  }

  Array.from(doc.body.children).forEach(mergeSpan);
  return doc.body.innerHTML;
}

/**
 * Sanitize a user-supplied URL before it is stored in a TipTap link `href`.
 *
 * DOMPurify only runs on HTML strings that are parsed into the DOM — it does
 * NOT intercept `editor.chain().setLink({ href })` because that goes through
 * ProseMirror's schema directly without HTML parsing. This function is the
 * "input-side" guard that catches dangerous schemes (javascript:, data:, vbscript:…)
 * before they ever reach the editor.
 *
 * Defence layers:
 *   1. Strip ASCII control characters (U+0000–U+001F) so tab/newline/null-byte
 *      tricks like "java\tscript:" or "java\nscript:" are collapsed away first.
 *   2. Allowlist — only http:, https:, mailto:, tel:, and relative/anchor URLs
 *      are accepted. Everything else (javascript:, data:, vbscript:, …) returns null.
 *
 * @returns The original (trimmed) URL if safe, or `null` if it fails validation.
 */
export function sanitizeUrl(url: string): string | null {
  // Strip all ASCII control characters (U+0000–U+001F) to neutralise scheme-
  // bypass tricks such as "java\tscript:" or "java\x00script:".
  // eslint-disable-next-line no-control-regex
  const cleaned = url.replace(/[\x00-\x1F]+/g, '').trim();

  if (!cleaned) return null;

  // Relative URLs: start with /, ./, ../, or # — always safe.
  if (/^[/#.]/.test(cleaned)) return cleaned;

  // Absolute URL — validate the scheme.
  try {
    const parsed = new URL(cleaned);
    const scheme = parsed.protocol; // e.g. "https:", "javascript:"
    if (scheme === 'https:' || scheme === 'http:' || scheme === 'mailto:' || scheme === 'tel:') {
      return cleaned;
    }
    return null; // Reject javascript:, data:, vbscript:, blob:, etc.
  } catch {
    // URL constructor throws for protocol-relative URLs (//example.com) and
    // bare hostnames (example.com). Treat those as valid non-dangerous URLs.
    // A genuine "javascript:…" will have already matched the URL() branch above.
    if (/^\/\//.test(cleaned)) return cleaned; // protocol-relative
    // Bare domains or paths without a recognised scheme — allow as relative href.
    return cleaned;
  }
}

/**
 * Convert standard Markdown checkbox lists generated by `marked` into TipTap's native TaskList schema.
 * `marked` generates: `<ul><li><input type="checkbox">...</li></ul>`
 * TipTap expects: `<ul data-type="taskList"><li data-type="taskItem" data-checked="true">...</li></ul>`
 */
export function convertMarkdownTaskLists(html: string): string {
  if (typeof window === 'undefined') return html;
  
  if (!html.includes('type="checkbox"')) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');

  doc.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    const li = checkbox.closest('li');
    if (!li) return;

    li.setAttribute('data-type', 'taskItem');
    li.setAttribute('data-checked', (checkbox as HTMLInputElement).hasAttribute('checked') || (checkbox as HTMLInputElement).checked ? 'true' : 'false');
    
    // Remove the raw checkbox since TipTap renders its own natively based on data-checked
    checkbox.remove();

    const ul = li.closest('ul');
    if (ul) {
      ul.setAttribute('data-type', 'taskList');
    }
  });

  return doc.body.innerHTML;
}