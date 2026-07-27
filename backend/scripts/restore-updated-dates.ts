import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  // Find articles whose updatedAt is suspiciously today (Jun 11 2026)
  // but were published/created much earlier — these were corrupted by viewCount increments.
  // Restore updatedAt = GREATEST(publishedAt, createdAt) for those articles.
  // For articles that were genuinely edited (have ArticleVersions), we use the latest version date.

  const today = new Date('2026-06-11T00:00:00Z');

  // Get all articles updated today that were created before today
  const corrupted = await prisma.article.findMany({
    where: {
      updatedAt: { gte: today },
      createdAt: { lt: today },
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      publishedAt: true,
      updatedAt: true,
      ArticleVersion: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  console.log(`Found ${corrupted.length} articles with corrupted updatedAt:`);

  for (const a of corrupted) {
    // If there's a real edit version, use that date; otherwise use publishedAt or createdAt
    const realUpdatedAt =
      a.ArticleVersion[0]?.createdAt ??
      a.publishedAt ??
      a.createdAt;

    console.log(`  "${a.title.substring(0, 55)}"`);
    console.log(`    Current updatedAt: ${a.updatedAt.toISOString()}`);
    console.log(`    Restoring to:      ${realUpdatedAt.toISOString()}`);

    // Use raw SQL to set updatedAt directly, bypassing Prisma's @updatedAt auto-stamp
    await prisma.$executeRaw`
      UPDATE "Article" SET "updatedAt" = ${realUpdatedAt} WHERE id = ${a.id}
    `;
  }

  console.log('\nDone! All affected articles restored.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
