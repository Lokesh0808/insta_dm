import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { initSocket } from './services/socket.service';
import { startAutomationWorker, stopAutomationWorker } from './jobs/automation.worker';
import { startMaintenanceWorker, stopMaintenanceWorker } from './jobs/maintenance.worker';
import { getAutomationQueue, getMaintenanceQueue, closeQueues } from './jobs/queues';
import { bootstrapAdmin } from './scripts/bootstrap-admin';

const start = async (): Promise<void> => {
  try {
    await connectDatabase(env.MONGODB_URI);
    logger.info('mongodb connected');

    await connectRedis();
    logger.info('redis connected');

    const app = createApp();
    const server = http.createServer(app);

    initSocket(server);

    // BullMQ workers (no-op when Redis is unavailable).
    try {
      startAutomationWorker();
      startMaintenanceWorker();
      const automationQueue = getAutomationQueue();
      const maintenanceQueue = getMaintenanceQueue();

      // Schedule recurring maintenance jobs (idempotent thanks to the job id).
      await automationQueue.upsertJobScheduler(
        'monthly-usage-reset',
        { pattern: '5 0 1 * *' },
        { name: 'reset-monthly-usage' },
      );
      await maintenanceQueue.upsertJobScheduler(
        'daily-subscription-check',
        { pattern: '0 */6 * * *' },
        { name: 'expire-subscriptions' },
      );
      await maintenanceQueue.upsertJobScheduler(
        'weekly-token-refresh',
        { pattern: '0 3 * * 1' },
        { name: 'refresh-tokens' },
      );
    } catch (error) {
      logger.error({ err: (error as Error).message }, 'failed to start queue workers');
    }

    await bootstrapAdmin();

    server.listen(env.PORT, () => {
      logger.info(`instaflow backend listening on port ${env.PORT} (${env.NODE_ENV})`);
    });

    const shutdown = async (signal: string): Promise<void> => {
      logger.info({ signal }, 'shutting down');
      server.close();
      await Promise.allSettled([
        stopAutomationWorker(),
        stopMaintenanceWorker(),
        closeQueues(),
        disconnectRedis(),
        disconnectDatabase(),
      ]);
      process.exit(0);
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('unhandledRejection', (reason) => {
      logger.error({ reason }, 'unhandled promise rejection');
    });
    process.on('uncaughtException', (error) => {
      logger.fatal({ err: error.message, stack: error.stack }, 'uncaught exception');
      process.exit(1);
    });
  } catch (error) {
    logger.fatal({ err: (error as Error).message }, 'failed to start server');
    process.exit(1);
  }
};

void start();
