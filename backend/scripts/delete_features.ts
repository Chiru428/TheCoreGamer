import { prisma } from '../src/lib/prisma';

async function main() {
  const result = await prisma.article.deleteMany({
    where: { contentType: 'FEATURE' as any },
  });
  console.log(`Deleted ${result.count} FEATURE articles.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
