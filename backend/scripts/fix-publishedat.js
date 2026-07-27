const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  // Fix all PUBLISHED articles where publishedAt is null
  // Set publishedAt = createdAt (mirrors what the article card already displays)
  const result = await prisma.article.updateMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: null,
    },
    data: {
      // We can't use a field reference in updateMany, so we do it in two steps
    },
  });

  // Use findMany + individual updates for COALESCE(createdAt) logic
  const broken = await prisma.article.findMany({
    where: { status: 'PUBLISHED', publishedAt: null },
    select: { id: true, createdAt: true, title: true },
  });

  console.log(`Found ${broken.length} published articles with null publishedAt:`);
  for (const a of broken) {
    console.log(`  - Fixing: "${a.title}" → publishedAt = ${a.createdAt.toISOString()}`);
    await prisma.article.update({
      where: { id: a.id },
      data: {
        publishedAt: a.createdAt,
        originallyPublishedAt: a.createdAt,
      },
    });
  }
  console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
