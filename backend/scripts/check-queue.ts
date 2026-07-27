import { Queue } from 'bullmq';
import { connection } from '../src/lib/bullmq';

const dealsQueue = new Queue('deals', { connection: connection as any });

async function main() {
  console.log('Delayed:', await dealsQueue.getDelayedCount());
  console.log('Repeatable:', await dealsQueue.getRepeatableJobs());
}

main().finally(() => process.exit(0));
