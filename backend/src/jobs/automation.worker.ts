import { Worker, type Job } from 'bullmq';
import { QUEUE_NAMES } from './queues';
import { bullConnection } from '../config/redis';
import { executeAutomation, type AutomationJobPayload } from '../services/automationEngine.service';
import { logger } from '../config/logger';

let worker: Worker | null = null;

/** Boots the BullMQ worker that processes queued automation replies. */
export const startAutomationWorker = (): Worker => {
  if (worker) return worker;

  worker = new Worker(
    QUEUE_NAMES.automation,
    async (job: Job<AutomationJobPayload>) => {
      logger.debug({ jobId: job.id }, 'processing automation job');
      await executeAutomation(job.data);
      return { ok: true };
    },
    {
      connection: bullConnection(),
      concurrency: 5,
      limiter: { max: 20, duration: 1_000 },
    },
  );

  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id }, 'automation job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'automation job failed');
  });

  worker.on('error', (err) => {
    logger.error({ err: err.message }, 'automation worker error');
  });

  logger.info('automation worker started');
  return worker;
};

export const stopAutomationWorker = async (): Promise<void> => {
  if (!worker) return;
  await worker.close();
  worker = null;
};
