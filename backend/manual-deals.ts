import { prisma } from './src/lib/prisma';
import { resolveItadId, getPrices } from './src/lib/itad';

async function run() {
  console.log('[ManualDeals] Starting price poll');
  let cursor: string | undefined;
  let processed = 0;
  const BATCH_SIZE = 50;

  const pollTime = new Date();
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
      await new Promise((r) => setTimeout(r, 150));
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
            regularINR: p.regular,
            storeLowINR: p.storeLow,
            cutPercent: p.cut,
            voucher: p.voucher,
            expiry: p.expiry ? new Date(p.expiry) : null,
            drm: p.drm,
            url: p.url,
            recordedAt: pollTime,
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);

      if (snapshotData.length > 0) {
        const created = await prisma.priceSnapshot.createMany({
          data: snapshotData,
          skipDuplicates: true,
        });
        console.log(`[ManualDeals] Bulk wrote ${created.count} price snapshots`);
      }
    }

    processed += games.length;
    if (games.length < BATCH_SIZE) break;
  }

  try {
    const now = new Date();
    const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6));
    let totalDeleted = 0;
    while (true) {
      const ids = await prisma.priceSnapshot.findMany({
        where: { recordedAt: { lt: cutoff } },
        select: { id: true },
        take: 500,
      });
      if (ids.length === 0) break;
      const res = await prisma.priceSnapshot.deleteMany({
        where: { id: { in: ids.map((i) => i.id) } },
      });
      totalDeleted += res.count;
    }
    console.log(`[ManualDeals] Deleted ${totalDeleted} old price snapshots`);
  } catch (err) {
    console.error(err);
  }

  console.log('[ManualDeals] Done.');
  process.exit(0);
}
run().catch(console.error);
