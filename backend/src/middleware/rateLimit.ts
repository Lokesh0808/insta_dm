import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { env } from '../config/env';

const handler = (
  req: Request,
  res: Response,
  _next: unknown,
  options: { limit?: number | ((req: Request) => number) },
): void => {
  const limit =
    typeof options.limit === 'function' ? options.limit(req) : (options.limit ?? 0);
  res.status(429).json({
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: `Too many requests. Limit is ${limit} per window.`,
    },
  });
};

const keyGenerator = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : undefined) ||
    req.ip ||
    req.socket.remoteAddress ||
    'unknown';
  const tenant = req.auth?.workspaceId ?? 'anon';
  return `${tenant}:${ip}`;
};

/** Global API limiter. */
export const apiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator,
  handler: handler as any,
  skip: (req) => req.path === '/health' || req.path === '/webhooks/instagram',
});

/** Stricter limiter for authentication endpoints. */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => `auth:${req.ip ?? 'unknown'}:${req.body?.email ?? ''}`,
  handler: handler as any,
});

/** Webhooks get a high ceiling — Meta retries aggressively. */
export const webhookLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.WEBHOOK_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => `hook:${req.ip ?? 'unknown'}`,
  handler: handler as any,
});
