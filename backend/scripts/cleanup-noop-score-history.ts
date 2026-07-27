import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const entries = await prisma.reviewScoreHistory.findMany({
    select: { id: true, reviewId: true, oldScore: true, newScore: true, changedAt: true },
  });

  const noopIds = entries
    .filter((e) => Number(e.oldScore) === Number(e.newScore))
    .map((e) => e.id);

  console.log(`Found ${entries.length} score history rows, ${noopIds.length} are no-op (oldScore === newScore).`);

  if (noopIds.length === 0) {
    console.log('Nothing to clean up.');
    return;
  }

  const { count } = await prisma.reviewScoreHistory.deleteMany({
    where: { id: { in: noopIds } },
  });

  console.log(`Deleted ${count} no-op score history rows.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
