import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const articles = await prisma.article.findMany({
    where: { contentType: 'REVIEW', status: 'PUBLISHED' },
    select: {
      title: true,
      publishedAt: true,
      createdAt: true,
    },
    orderBy: [
      { publishedAt: { sort: 'desc', nulls: 'last' } },
      { createdAt: 'desc' },
    ],
  });
  console.log('DB sort result:');
  articles.forEach((a, i) => {
    console.log(`${i + 1}. "${a.title.substring(0, 50)}" | publishedAt: ${a.publishedAt?.toISOString() || 'NULL'} | createdAt: ${a.createdAt.toISOString()}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
