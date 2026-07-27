import { prisma } from '../src/lib/prisma';
import { resolveItadId, getPrices } from '../src/lib/itad';

async function main() {
  console.log('[ManualITAD] Starting price poll');
  let cursor: string | undefined;
  let processed = 0;
  const BATCH_SIZE = 50;

  while (true) {
    const games = await prisma.game.findMany({
      select: { id: true, steamAppId: true, title: true },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    });

    if (games.length === 0) break;
    cursor = games[games.length - 1].id;

    const itadMappings: Array<{ gameId: string; itadId: string; gameTitle: string }> = [];

    for (const game of games) {
      const itadId = await resolveItadId(game.id, game.steamAppId, game.title);
      if (!itadId) continue;
      itadMappings.push({ gameId: game.id, itadId, gameTitle: game.title });
    }

    if (itadMappings.length === 0) {
      if (games.length < BATCH_SIZE) break;
      processed += games.length;
      continue;
    }

    const itadIds = itadMappings.map((m) => m.itadId);
    const prices = await getPrices(itadIds);

    if (prices.length > 0) {
      const snapshotData = prices
        .map((p) => {
          const mapping = itadMappings.find((m) => m.itadId === p.gameId);
          if (!mapping) return null;
          return {
            gameId: mapping.gameId,
            shop: p.shop,
            priceINR: p.price,
            cutPercent: p.cut,
            url: p.url,
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);

      if (snapshotData.length > 0) {
        const created = await prisma.priceSnapshot.createMany({
          data: snapshotData,
          skipDuplicates: false,
        });
        console.log(`[ManualITAD] Bulk wrote ${created.count} price snapshots`);
      }
    }

    processed += games.length;
    if (games.length < BATCH_SIZE) break;
  }
  console.log('[ManualITAD] Finished.');
}

main().finally(() => prisma.$disconnect());
