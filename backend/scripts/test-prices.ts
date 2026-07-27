import { prisma } from '../src/lib/prisma';
async function main() {
  console.log('Total snapshots:', await prisma.priceSnapshot.count());
  const latest = await prisma.priceSnapshot.findFirst({ orderBy: { recordedAt: 'desc' } });
  console.log('Latest:', latest?.recordedAt);
}
main().finally(() => process.exit(0));
