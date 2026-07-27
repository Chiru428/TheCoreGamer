import 'dotenv/config';
import { prisma } from './src/lib/prisma';
import { resolveItadId, getPrices } from './src/lib/itad';

async function main() {
  console.log('Starting...');
  const games = await prisma.game.findMany({
    select: { id: true, title: true, steamAppId: true },
    take: 10,
  });
  console.log('Fetched', games.length, 'games');

  const itadMappings: Array<{ gameId: string; itadId: string }> = [];

  for (const game of games) {
    let itadId: string | null = null;
    try {
      itadId = await resolveItadId(game.id, game.steamAppId, game.title);
    } catch (e) {
      console.log('Error resolving ITAD ID for', game.title, e);
    }
    if (itadId) itadMappings.push({ gameId: game.id, itadId });
  }

  console.log('Mappings:', itadMappings.length);

  if (itadMappings.length > 0) {
    console.log('Fetching prices...');
    const prices = await getPrices(itadMappings.map((m) => m.itadId));
    console.log('Got prices:', prices.length);
  }

  console.log('Done!');
}

main().finally(() => prisma.$disconnect());

