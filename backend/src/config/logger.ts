import pino from 'pino';
import { env, isProd } from './env';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'instaflow-backend' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-ig-access-token"]',
      'password',
      'passwordHash',
      '*.password',
      '*.passwordHash',
      'accessToken',
      '*.accessToken',
      'refreshToken',
      '*.refreshToken',
      'token',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,service' },
      },
});

export const log = {
  info: (obj: unknown, msg?: string) => logger.info(obj, msg),
  warn: (obj: unknown, msg?: string) => logger.warn(obj, msg),
  error: (obj: unknown, msg?: string) => logger.error(obj, msg),
  debug: (obj: unknown, msg?: string) => logger.debug(obj, msg),
  child: logger.child.bind(logger),
};
