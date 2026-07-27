import 'dotenv/config';
import { dealsQueue, redisClient } from './src/lib/bullmq';

async function main() {
  await dealsQueue.add('poll-prices-manual', { trigger: 'poll' });
  console.log('Successfully enqueued manual ITAD sync job!');
}

main()
  .then(async () => {
    await dealsQueue.close();
    redisClient.disconnect();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
