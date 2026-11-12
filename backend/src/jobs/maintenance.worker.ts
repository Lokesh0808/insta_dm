import { Worker } from 'bullmq';
import { QUEUE_NAMES } from './queues';
import { bullConnection } from '../config/redis';
import { resetMonthlyUsage } from '../services/usage.service';
import { expireSubscription } from '../services/billing.service';
import { Subscription } from '../models/Subscription';
import { InstagramToken } from '../models/InstagramToken';
import { refreshAccessToken } from '../services/instagram.service';
import { logger } from '../config/logger';

let worker: Worker | null = null;

/** Periodic housekeeping: usage reset, subscription expiry and token refresh. */
export const startMaintenanceWorker = (): Worker => {
  if (worker) return worker;

  worker = new Worker(
    QUEUE_NAMES.maintenance,
    async (job) => {
      switch (job.name) {
        case 'reset-monthly-usage': {
          await resetMonthlyUsage();
          break;
        }
        case 'expire-subscriptions': {
          const expired = await Subscription.find({
            status: { $in: ['active', 'trialing', 'past_due'] },
            currentPeriodEnd: { $lt: new Date() },
          })
            .select('workspace')
            .lean();
          for (const subscription of expired) {
            await expireSubscription(subscription.workspace.toString());
          }
          logger.info({ count: expired.length }, 'expired subscriptions processed');
          break;
        }
        case 'refresh-tokens': {
          const soon = await InstagramToken.find({
            isValid: true,
            expiresAt: { $lt: new Date(Date.now() + 7 * 24 * 3600 * 1000) },
          })
            .select('instagramAccount')
            .lean();
          for (const token of soon) {
            try {
              const refreshed = await refreshAccessToken(token.instagramAccount.toString());
              if (!refreshed) {
                await InstagramToken.updateOne(
                  { _id: token._id },
                  { $set: { isValid: false, lastError: 'Token refresh failed' } },
                );
              }
            } catch (error) {
              logger.error(
                { err: (error as Error).message, accountId: token.instagramAccount.toString() },
                'token refresh failed',
              );
            }
          }
          break;
        }
        default:
          logger.warn({ job: job.name }, 'unknown maintenance job');
      }
      return { ok: true };
    },
    { connection: bullConnection(), concurrency: 1 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ job: job?.name, err: err.message }, 'maintenance job failed');
  });

  logger.info('maintenance worker started');
  return worker;
};

export const stopMaintenanceWorker = async (): Promise<void> => {
  if (!worker) return;
  await worker.close();
  worker = null;
};
