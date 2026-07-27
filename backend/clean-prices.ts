import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Deleting existing price snapshots to allow unique constraint creation...');
  const { count } = await prisma.priceSnapshot.deleteMany({});
  console.log(`Deleted ${count} price snapshots.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
