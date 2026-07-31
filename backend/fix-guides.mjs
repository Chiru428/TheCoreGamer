import { PrismaClient } from './src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  const allGuides = await prisma.article.findMany({
    where: {
      contentType: 'GUIDE',
    }
  });

  console.log(`Found ${allGuides.length} total guides.`);
  
  for (const article of allGuides) {
    console.log(`Guide: ${article.slug}, guideType: '${article.guideType}'`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
