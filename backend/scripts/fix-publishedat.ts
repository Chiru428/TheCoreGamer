import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const broken = await prisma.article.findMany({
    where: { status: 'PUBLISHED', publishedAt: null },
    select: { id: true, createdAt: true, title: true },
  });

  console.log(`Found ${broken.length} published articles with null publishedAt:`);
  for (const a of broken) {
    console.log(`  Fixing: "${a.title}" → publishedAt = ${a.createdAt.toISOString()}`);
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
