import { prisma } from '../src/lib/prisma';
async function main() {
  const prices = await prisma.priceSnapshot.findMany({
    orderBy: { recordedAt: 'desc' },
    take: 5,
  });
  console.log(prices);
}
main().finally(() => prisma.$disconnect());
