import { prisma } from '../src/lib/prisma';
import { getIGDBGame, mapIGDBGameToDb } from '../src/lib/igdb';
import { cacheDeletePattern } from '../src/lib/redis';

// One-off: pulls fresh IGDB data (incl. the new external_games-derived Xbox /
// PlayStation Store links) into every game already linked to IGDB. Mirrors the
// per-game resync logic in the admin import route / igdb.worker.ts.
async function main() {
  const games = await prisma.game.findMany({
    where: { igdbId: { not: null } },
    select: { id: true, title: true, igdbId: true, websitesJson: true },
    orderBy: { id: 'asc' },
  });

  console.log(`Resyncing ${games.length} games from IGDB...`);

  let updated = 0;
  let failed = 0;
  const gotXbox: string[] = [];
  const gotPlaystation: string[] = [];

  for (const game of games) {
    if (!game.igdbId) continue;
    try {
      const igdbGame = await getIGDBGame(game.igdbId);
      const mapped = mapIGDBGameToDb(igdbGame);

      delete mapped.title;
      delete mapped.coverImageUrl;
      delete mapped.backgroundImageUrl;
      if (mapped.esrbRating == null) delete mapped.esrbRating;
      if (mapped.pegiRating == null) delete mapped.pegiRating;

      const existingWebsites = (game.websitesJson as Record<string, string> | null) || {};
      const newWebsites = (mapped.websitesJson as Record<string, string | undefined> | undefined) || {};
      const mergedWebsites: Record<string, string> = { ...existingWebsites };
      for (const [key, value] of Object.entries(newWebsites)) {
        if (value) mergedWebsites[key] = value;
      }
      mapped.websitesJson = mergedWebsites as unknown as typeof mapped.websitesJson;

      await prisma.game.update({ where: { id: game.id }, data: mapped });

      if (newWebsites.xbox) gotXbox.push(game.title);
      if (newWebsites.playstation) gotPlaystation.push(game.title);

      updated++;
      console.log(`  ✓ ${game.title}`);
    } catch (err) {
      failed++;
      console.warn(`  ✗ ${game.title}: ${err instanceof Error ? err.message : err}`);
    }

    // IGDB free tier allows 4 req/s — stay well under it
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  await cacheDeletePattern('games:list:*');

  console.log(`\nDone. Updated ${updated}, failed ${failed}.`);
  console.log(`Xbox link found for: ${gotXbox.length ? gotXbox.join(', ') : '(none)'}`);
  console.log(`PlayStation link found for: ${gotPlaystation.length ? gotPlaystation.join(', ') : '(none)'}`);
}

main().catch(console.error).finally(() => process.exit(0));
