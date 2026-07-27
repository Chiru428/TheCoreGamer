const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const articles = await prisma.article.findMany({
    select: {
      title: true,
      publishedAt: true,
      createdAt: true,
    },
    orderBy: {
      publishedAt: 'desc'
    },
    take: 5
  });
  console.log(articles);
}

main().catch(console.error).finally(() => prisma.$disconnect());
