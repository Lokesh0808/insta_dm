import { Queue } from 'bullmq';
import { getAutomationQueue } from './queues';
import type { AutomationJobPayload } from '../services/automationEngine.service';
import { logger } from '../config/logger';

/**
 * Enqueues an automation reply for asynchronous execution.
 * A delay is supported so automations can pause before replying (e.g. to look
 * natural and to respect Meta's messaging policies).
 */
export const enqueueAutomationJob = async (payload: AutomationJobPayload): Promise<string> => {
  const queue: Queue = getAutomationQueue();
  const delay = Math.max(0, (payload.delaySeconds ?? 0) * 1000);

  const job = await queue.add('execute-automation', payload, {
    delay,
    jobId: `${payload.executionId}`,
  });

  logger.debug({ jobId: job.id, delay }, 'automation job enqueued');
  return job.id ?? '';
};

export const getAutomationJob = async (executionId: string) => {
  const queue = getAutomationQueue();
  return queue.getJob(executionId);
};
