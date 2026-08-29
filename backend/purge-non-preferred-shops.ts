/**
 * purge-non-preferred-shops.ts
 *
 * One-time cleanup: deletes all PriceSnapshot rows whose `shop` is NOT one of
 * the 5 preferred stores we now track (Steam, Epic, GOG, Humble, Fanatical).
 *
 * Uses chunked deletes (500 rows at a time) to avoid long table locks that
 * would block live price reads during the cleanup.
 *
 * Run once after deploying the shop-filter update:
 *   npx tsx purge-non-preferred-shops.ts
 *
 * Safe to re-run — if there are no rows left to delete it exits cleanly.
 */

import { PrismaClient } from "./src/generated/prisma";

const prisma = new PrismaClient();

const PREFERRED_SHOPS = [
  "Steam",
  "Epic Games Store",
  "GOG",
  "Humble Store",
  "Fanatical",
];

const CHUNK_SIZE = 500;
const CHUNK_DELAY_MS = 200; // pause between chunks to stay gentle on the DB

async function main() {
  console.log("=== PriceSnapshot non-preferred shop purge ===");
  console.log(`Keeping shops: ${PREFERRED_SHOPS.join(", ")}`);
  console.log("Deleting all records from any other shop...\n");

  // First, show a count of what will be deleted (dry-run preview)
  const totalToDelete = await prisma.priceSnapshot.count({
    where: { shop: { notIn: PREFERRED_SHOPS } },
  });

  if (totalToDelete === 0) {
    console.log("✅ Nothing to delete — DB is already clean.");
    return;
  }

  console.log(`Found ${totalToDelete.toLocaleString()} rows to delete.\n`);

  // Show a breakdown by shop so you know exactly what's being removed
  const breakdown = await prisma.priceSnapshot.groupBy({
    by: ["shop"],
    where: { shop: { notIn: PREFERRED_SHOPS } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  console.log("Breakdown by shop:");
  for (const row of breakdown) {
    console.log(`  ${row.shop.padEnd(30)} ${row._count.id.toLocaleString()} rows`);
  }
  console.log();

  // Chunked delete loop
  let totalDeleted = 0;
  let iteration = 0;

  while (true) {
    iteration++;

    // Find IDs of the next chunk to delete
    const chunk = await prisma.priceSnapshot.findMany({
      where: { shop: { notIn: PREFERRED_SHOPS } },
      select: { id: true },
      take: CHUNK_SIZE,
    });

    if (chunk.length === 0) break;

    const ids = chunk.map((r) => r.id);
    const { count } = await prisma.priceSnapshot.deleteMany({
      where: { id: { in: ids } },
    });

    totalDeleted += count;
    const pct = ((totalDeleted / totalToDelete) * 100).toFixed(1);
    console.log(
      `  Chunk ${iteration}: deleted ${count} rows` +
        ` (total: ${totalDeleted.toLocaleString()} / ${totalToDelete.toLocaleString()} — ${pct}%)`
    );

    if (chunk.length < CHUNK_SIZE) break; // last chunk

    // Small pause between chunks to avoid overwhelming the DB connection pool
    await new Promise((r) => setTimeout(r, CHUNK_DELAY_MS));
  }

  console.log(`\n✅ Done — removed ${totalDeleted.toLocaleString()} stale PriceSnapshot rows.`);
  console.log(`   Only Steam, Epic, GOG, Humble Store, and Fanatical prices remain.`);
}

main()
  .catch((e) => {
    console.error("❌ Purge failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
