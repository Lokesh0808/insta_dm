import { Queue, type JobsOptions, type Worker } from 'bullmq';
import { bullConnection } from '../config/redis';
import { logger } from '../config/logger';

export const QUEUE_NAMES = {
  automation: 'instaflow-automation',
  maintenance: 'instaflow-maintenance',
} as const;

let automationQueue: Queue | null = null;
let maintenanceQueue: Queue | null = null;

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { age: 3_600, count: 1_000 },
  removeOnFail: { age: 86_400 },
};

export const getAutomationQueue = (): Queue => {
  if (!automationQueue) {
    automationQueue = new Queue(QUEUE_NAMES.automation, {
      connection: bullConnection(),
      defaultJobOptions,
    });
    automationQueue.on('error', (err) => logger.error({ err: err.message }, 'automation queue error'));
  }
  return automationQueue;
};

export const getMaintenanceQueue = (): Queue => {
  if (!maintenanceQueue) {
    maintenanceQueue = new Queue(QUEUE_NAMES.maintenance, {
      connection: bullConnection(),
      defaultJobOptions: { attempts: 2, removeOnComplete: { age: 3_600 } },
    });
  }
  return maintenanceQueue;
};

export const closeQueues = async (): Promise<void> => {
  await Promise.allSettled([
    automationQueue?.close(),
    maintenanceQueue?.close(),
  ]);
  automationQueue = null;
  maintenanceQueue = null;
};

export type WorkerRef = Worker;
