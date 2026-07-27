import { redis } from '../src/lib/redis';

async function main() {
  // Clear all posts list cache keys
  const keys = await redis.keys('posts:list:*');
  console.log(`Found ${keys.length} cached posts:list keys to delete`);
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log('Deleted!');
  }
  // Also clear reviews cache just in case
  const rkeys = await redis.keys('reviews:list:*');
  console.log(`Found ${rkeys.length} cached reviews:list keys to delete`);
  if (rkeys.length > 0) {
    await redis.del(...rkeys);
    console.log('Deleted!');
  }
  console.log('Cache cleared.');
}

main().catch(console.error).finally(() => process.exit(0));
