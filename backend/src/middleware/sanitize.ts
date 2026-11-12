import mongoose from 'mongoose';
import { ForbiddenError } from '../utils/errors';

/**
 * Guards against NoSQL operator injection by rejecting request bodies/queries
 * containing objects that start with `$` or contain `.` keys.
 */
const FORBIDDEN_KEYS = ['$where', '$regex', '$gt', '$gte', '$lt', '$lte', '$ne', '$nin', '$or', '$and'];

const sanitizeValue = (value: unknown, depth = 0, rejectDottedKeys = true): void => {
  if (depth > 12 || value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((v) => sanitizeValue(v, depth + 1, rejectDottedKeys));
    return;
  }
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (key.startsWith('$') || FORBIDDEN_KEYS.includes(key)) {
      throw new ForbiddenError(`Illegal query operator detected: ${key}`);
    }
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new ForbiddenError(`Illegal key detected: ${key}`);
    }
    // Dotted keys are legitimate in query strings (e.g. Meta's `hub.mode`),
    // but never inside a body or a route parameter.
    if (rejectDottedKeys && key.includes('.')) {
      throw new ForbiddenError(`Illegal key detected: ${key}`);
    }
    sanitizeValue(val, depth + 1, rejectDottedKeys);
  }
};

export const mongoSanitize = (req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction): void => {
  try {
    sanitizeValue(req.body);
    sanitizeValue(req.params);
    sanitizeValue(req.query, 0, false);
    next();
  } catch (error) {
    next(error);
  }
};

/** Validates that a value is a well-formed Mongo ObjectId. */
export const isValidObjectId = (value: unknown): value is string =>
  typeof value === 'string' && mongoose.Types.ObjectId.isValid(value) && value.length === 24;
