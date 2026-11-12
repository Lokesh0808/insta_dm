import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../config/logger';
import { env } from '../config/env';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
};

interface MongooseValidationError extends Error {
  name: 'ValidationError';
  errors: Record<string, { message: string }>;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.values((err as MongooseValidationError).errors).map((e) => e.message);
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid value for "${err.path}"`;
  } else if (
    err instanceof mongoose.Error ||
    (err as { code?: number })?.code === 11000
  ) {
    statusCode = 409;
    code = 'CONFLICT';
    const keyPattern = (err as { keyPattern?: Record<string, unknown> }).keyPattern ?? {};
    const field = Object.keys(keyPattern)[0];
    message = field ? `A record with this ${field} already exists` : 'Duplicate record';
  } else if (err instanceof mongoose.Error.DocumentNotFoundError) {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Resource not found';
  } else if (err?.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Invalid authentication token';
  } else if (err?.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token expired';
  } else if (typeof err === 'object' && err !== null && 'type' in err) {
    const e = err as { type: string; message?: string };
    if (e.type === 'entity.parse.failed') {
      statusCode = 400;
      code = 'INVALID_JSON';
      message = 'Malformed JSON body';
    }
  }

  const logPayload = {
    err: err instanceof Error ? err.message : err,
    code,
    statusCode,
    path: req.originalUrl,
    method: req.method,
    requestId: req.requestId,
    stack: env.NODE_ENV === 'development' && err instanceof Error ? err.stack : undefined,
  };

  if (statusCode >= 500) logger.error(logPayload, 'Unhandled request error');
  else logger.warn(logPayload, 'Request failed');

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: statusCode >= 500 && env.NODE_ENV === 'production' ? 'Internal server error' : message,
      ...(details ? { details } : {}),
    },
    ...(req.requestId ? { requestId: req.requestId } : {}),
  });
};
