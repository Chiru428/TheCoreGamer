import 'dotenv/config';
import { dealsQueue } from './src/lib/bullmq';

async function main() {
  // Remove stale repeatable jobs and re-add so BullMQ schedules from NOW
  const repeatableJobs = await dealsQueue.getRepeatableJobs();
  console.log('Current repeatable jobs:', repeatableJobs.length);
  for (const job of repeatableJobs) {
    await dealsQueue.removeRepeatableByKey(job.key);
    console.log('Removed stale repeatable job:', job.key, 'next:', job.next ? new Date(job.next).toISOString() : 'N/A');
  }

  // Re-register fresh — BullMQ will now schedule the next run from the current time
  await dealsQueue.add(
    'poll-prices',
    { trigger: 'poll' },
    {
      repeat: { pattern: '0 * * * *' },
      jobId: 'deals-poll-hourly',
    }
  );
  console.log('Re-registered repeatable job. Next run at top of next hour.');

  const newJobs = await dealsQueue.getRepeatableJobs();
  console.log('New repeatable jobs:', newJobs.length);
  for (const j of newJobs) {
    console.log('  -', j.key, 'next:', j.next ? new Date(j.next).toISOString() : 'N/A');
  }
}

main().catch(console.error);
