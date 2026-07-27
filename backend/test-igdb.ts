import { PrismaClient } from '@prisma/client';
import { getIGDBGame } from './src/lib/igdb';

const prisma = new PrismaClient();

async function main() {
  const game = await prisma.game.findFirst({ where: { title: { contains: 'Grand Theft Auto VI' } } });
  console.log('DB Game:', game?.title, game?.igdbId, game?.releaseStatus);
  if (game?.igdbId) {
    const igdbGame = await getIGDBGame(game.igdbId);
    console.log('IGDB Game status:', igdbGame.status);
    console.log('IGDB Game first_release_date:', igdbGame.first_release_date);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
