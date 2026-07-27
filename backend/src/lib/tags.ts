import { prisma } from "./prisma";
import { generateUniqueSlug } from "./slug";

/**
 * Resolve a list of tag names to Tag ids, creating any tags that don't exist yet.
 */
export async function resolveTagIds(tagNames: string[]): Promise<string[]> {
  return Promise.all(
    tagNames.map(async (name) => {
      const trimmed = name.trim();
      const existing = await prisma.tag.findUnique({ where: { name: trimmed } });
      if (existing) return existing.id;
      const tagSlug = await generateUniqueSlug(trimmed, "tag");
      const created = await prisma.tag.create({ data: { name: trimmed, slug: tagSlug } });
      return created.id;
    })
  );
}
