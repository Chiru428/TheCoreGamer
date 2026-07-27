import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

// Existing rows still point at IGDB's low-res "cover_big" (264x374) size token.
// New imports now use "1080p" (see src/lib/igdb.ts resolveCoverUrl); this backfills
// already-imported games so the public site renders the sharper art too.
async function main() {
  const games = await prisma.game.findMany({
    where: { coverImageUrl: { contains: '/t_cover_big/' } },
    select: { id: true, title: true, coverImageUrl: true },
  });

  console.log(`Found ${games.length} games with low-res IGDB cover art:`);
  for (const g of games) {
    const upgraded = g.coverImageUrl!.replace('/t_cover_big/', '/t_1080p/');
    console.log(`  Upgrading: "${g.title}"`);
    await prisma.game.update({
      where: { id: g.id },
      data: { coverImageUrl: upgraded },
    });
  }
  console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
