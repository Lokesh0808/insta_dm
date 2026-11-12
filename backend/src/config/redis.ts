import Redis, { type RedisOptions } from 'ioredis';
import { env } from './env';
import { logger } from './logger';

const baseOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  db: env.REDIS_DB,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy: (times: number) => Math.min(times * 200, 5_000),
  lazyConnect: true,
};

export const redis = new Redis(baseOptions);

export const redisSubscriber = new Redis(baseOptions);

let connected = false;

export const connectRedis = async (): Promise<void> => {
  if (connected) return;
  await Promise.all([redis.connect(), redisSubscriber.connect()]);
  connected = true;
  logger.info({ host: env.REDIS_HOST, port: env.REDIS_PORT }, 'redis connected');
};

export const disconnectRedis = async (): Promise<void> => {
  if (!connected) return;
  await Promise.allSettled([redis.quit(), redisSubscriber.quit()]);
  connected = false;
};

export const isRedisReady = (): boolean => redis.status === 'ready';

/** BullMQ requires a connection that supports blocking commands. */
export const bullConnection = () =>
  new Redis({
    ...baseOptions,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

redis.on('error', (err) => logger.error({ err: err.message }, 'redis error'));
redisSubscriber.on('error', (err) => logger.error({ err: err.message }, 'redis subscriber error'));

export default redis;
