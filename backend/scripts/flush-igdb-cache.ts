import { redis } from '../src/lib/redis';

async function main() {
  console.log('Starting IGDB cache flush...');

  // Clear IGDB game cache keys
  const gameKeys = await redis.keys('igdb:game:*');
  console.log(`Found ${gameKeys.length} cached igdb:game keys to delete`);
  if (gameKeys.length > 0) {
    await redis.del(...gameKeys);
    console.log('Deleted igdb:game keys!');
  }

  // Clear IGDB search cache keys
  const searchKeys = await redis.keys('igdb:search:*');
  console.log(`Found ${searchKeys.length} cached igdb:search keys to delete`);
  if (searchKeys.length > 0) {
    await redis.del(...searchKeys);
    console.log('Deleted igdb:search keys!');
  }

  console.log('IGDB cache flush complete.');
}

main().catch(console.error).finally(() => process.exit(0));
