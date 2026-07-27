import { prisma } from '../src/lib/prisma';
import { resolveItadId, getPrices } from '../src/lib/itad';

async function main() {
  const game = await prisma.game.findFirst({ where: { title: 'Dead Cells' } });
  if (!game) return console.log('Game not found');
  console.log('Game:', game.title);
  const itadId = await resolveItadId(game.id, game.steamAppId, game.title);
  console.log('ITAD ID:', itadId);
  const prices = await getPrices([itadId!]);
  console.log('Prices count:', prices.length);
  if (prices.length > 0) {
      console.log(prices[0]);
  }
}

main().finally(() => prisma.$disconnect());
