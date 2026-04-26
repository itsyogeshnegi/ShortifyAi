import cron from 'node-cron';
import Job from '../models/Job.js';
import { runGenerationPipeline } from './generationService.js';

let started = false;

export function startSchedulerCron() {
  if (started) return;
  started = true;

  cron.schedule('* * * * *', async () => {
    const jobs = await Job.find({ status: 'scheduled', scheduledFor: { $lte: new Date() } }).limit(3);

    for (const job of jobs) {
      job.status = 'processing';
      job.attempts += 1;
      await job.save();

      try {
        await runGenerationPipeline({ userId: job.user, projectId: job.project, input: job.payload });
        job.status = 'completed';
        await job.save();
      } catch (error) {
        job.status = 'failed';
        job.errorMessage = error.message;
        await job.save();
      }
    }
  });
}
