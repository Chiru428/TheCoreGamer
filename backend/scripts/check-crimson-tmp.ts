import { PrismaClient } from '../src/generated/prisma';
const prisma = new PrismaClient();
async function main() {
  const game = await prisma.game.findFirst({
    where: { title: { contains: 'Crimson Desert', mode: 'insensitive' } },
    select: { id: true, title: true, slug: true },
  });
  console.log('Game:', game);

  const article = await prisma.article.findFirst({
    where: { title: { contains: 'Crimson Desert', mode: 'insensitive' } },
    select: {
      id: true, title: true, slug: true, status: true, contentType: true, publishedAt: true,
      Game: { select: { id: true, title: true, slug: true } },
      GameReview: { select: { id: true, gameId: true, reviewScore: true } },
    },
  });
  console.log('Article:', JSON.stringify(article, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
