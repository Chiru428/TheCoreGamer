import { prisma } from "./prisma";
import { STOP_WORDS } from "./constants";

/**
 * Generate a URL-safe slug from a title.
 * - Lowercase, replace non-alphanum with hyphens
 * - Remove stop words (fallback to full word list if all words are stop words)
 * - Max 75 chars
 * - Append -2, -3 etc. if slug already exists
 */
export function generateBaseSlug(title: string): string {
  const allWords = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 0);

  // FIX: only filter stop words if meaningful words remain; otherwise use all words
  const filteredWords = allWords.filter((word) => !STOP_WORDS.has(word));
  const words = filteredWords.length > 0 ? filteredWords : allWords;

  let slug = words.join("-");

  // Trim to max 75 chars, don't cut in middle of a word
  if (slug.length > 75) {
    slug = slug.substring(0, 75);
    const lastHyphen = slug.lastIndexOf("-");
    if (lastHyphen > 0) {
      slug = slug.substring(0, lastHyphen);
    }
  }

  return slug || "untitled";
}

/**
 * Generate a unique slug by checking the database for conflicts
 */
export async function generateUniqueSlug(
  title: string,
  table: "article" | "game" | "tag" = "article"
): Promise<string> {
  const baseSlug = generateBaseSlug(title);
  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    let exists = false;

    switch (table) {
      case "article":
        exists = !!(await prisma.article.findUnique({ where: { slug } }));
        break;
      case "game":
        exists = !!(await prisma.game.findUnique({ where: { slug } }));
        break;

      case "tag":
        exists = !!(await prisma.tag.findUnique({ where: { slug } }));
        break;
    }

    if (!exists) return slug;

    suffix++;
    slug = `${baseSlug}-${suffix}`;
  }
}

/**
 * Generate a unique slug for a user's reading list (unique per user, not globally).
 */
export async function generateUniqueListSlug(userId: string, name: string): Promise<string> {
  const baseSlug = generateBaseSlug(name);
  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const exists = await prisma.readingList.findUnique({
      where: { userId_slug: { userId, slug } },
    });
    if (!exists) return slug;

    suffix++;
    slug = `${baseSlug}-${suffix}`;
  }
}

export default generateUniqueSlug;
