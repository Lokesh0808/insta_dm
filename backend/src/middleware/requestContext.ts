import type { RequestHandler } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../config/logger';

export const requestContext: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id');
  const requestId = incoming && incoming.length <= 64 ? incoming : randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  const start = Date.now();
  res.on('finish', () => {
    logger.debug(
      {
        requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Date.now() - start,
      },
      'request',
    );
  });
  next();
};
