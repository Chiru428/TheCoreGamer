/**
 * Generate a deterministic, URL-safe anchor ID from heading text.
 * Used by: ArticleBody, TocBlock, TOC insertion, Markdown pipeline.
 * Algorithm: lowercase → Unicode normalize → strip non-word chars 
 *            → collapse hyphens → trim → prefix "h-"
 */
export function generateHeadingId(text: string): string {
  if (!text || !text.trim()) return 'h-section';

  // Strip HTML tags if present (e.g. from TipTap)
  const plainText = text.replace(/<[^>]*>?/gm, '');

  const slug = plainText
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip diacritics
    .replace(/[^\w\s-]/g, '')           // strip non-word chars (keeping hyphens and spaces)
    .trim()
    .replace(/[\s_]+/g, '-')            // spaces and underscores to hyphens
    .replace(/-+/g, '-')                // collapse multiple hyphens
    .slice(0, 60)                       // max length
    .replace(/-+$/, '');                // trim trailing hyphens

  return `h-${slug || 'section'}`;
}

/**
 * Given a list of heading texts in document order, produce 
 * deduplicated IDs (appends -2, -3 for duplicates).
 */
export function generateHeadingIds(texts: string[]): string[] {
  const counts = new Map<string, number>();
  
  return texts.map(text => {
    const baseId = generateHeadingId(text);
    const count = counts.get(baseId) || 0;
    
    if (count === 0) {
      counts.set(baseId, 1);
      return baseId;
    } else {
      const newCount = count + 1;
      counts.set(baseId, newCount);
      return `${baseId}-${newCount}`;
    }
  });
}

/**
 * Legacy slugify function for backward compatibility.
 * Produces IDs in the old "heading-X" format.
 */
export function slugifyLegacy(text: string): string {
  const plainText = text.replace(/<[^>]*>?/gm, '');
  const slug = plainText
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .slice(0, 50)
    .replace(/-+$/, '');
    
  return `heading-${slug || 'section'}`;
}

/**
 * A marked extension that adds IDs to headings using our unified generator.
 *
 * IMPORTANT: The counts Map is created fresh inside each renderer call so it
 * resets per-document rather than persisting across multiple parse() calls in
 * the same browser session.  Putting it in the closure returned by
 * markedHeadingIdExtension() would cause duplicate-heading deduplication to
 * produce wrong IDs after the first article is parsed.
 */
export function markedHeadingIdExtension() {
  return {
    renderer: {
      heading(token: any) {
        // The counts Map lives here — re-created on every heading call within
        // the same renderer instance.
        if (!_headingCountsByRenderer.has(this)) {
          _headingCountsByRenderer.set(this, new Map<string, number>());
        }
        const counts = _headingCountsByRenderer.get(this)!;

        // marked v15 passes a single Token object
        const text = token.text;
        const level = token.depth;

        // Handle custom IDs: # My Heading {#custom-id}
        const customIdMatch = text.match(/\{#([^}]+)\}$| \{(?:#[^}]+)\}$/);
        if (customIdMatch) {
          const id = customIdMatch[1];
          const cleanText = text.replace(/\{#[^}]+\}$| \{(?:#[^}]+)\}$ /g, '').trim();
          // We ideally should use parseInline on token.tokens, but for simple headings text is fine
          return `<h${level} id="${id}">${cleanText}</h${level}>\n`;
        }

        const baseId = generateHeadingId(text);
        const count = counts.get(baseId) || 0;
        const id = count > 0 ? `${baseId}-${count + 1}` : baseId;
        counts.set(baseId, count + 1);

        return `<h${level} id="${id}">${text}</h${level}>\n`;
      },
    },
  };
}

/**
 * Module-level WeakMap so heading counts are shared across all heading()
 * calls that belong to the same renderer instance (one document parse), but
 * are automatically cleaned up when the renderer is garbage-collected.
 */
const _headingCountsByRenderer = new WeakMap<object, Map<string, number>>();
