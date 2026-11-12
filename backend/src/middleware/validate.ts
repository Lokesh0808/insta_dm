import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors';

type Source = 'body' | 'query' | 'params';

const parse = (schema: ZodSchema, data: unknown, source: Source) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(
      'Validation failed',
      result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
        code: issue.code,
      })),
    );
  }
  return result.data;
};

/** Validates and REPLACES `req.body` with the parsed (typed, coerced) value. */
export const validate = (schema: ZodSchema, source: Source = 'body'): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = parse(schema, req[source], source);
      if (source === 'body') req.body = parsed;
      else {
        Object.assign(req, { [`valid${source[0].toUpperCase()}${source.slice(1)}`]: parsed });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any)[source] = parsed;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new ValidationError(
            'Validation failed',
            error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
          ),
        );
        return;
      }
      next(error);
    }
  };
};

/** Validates without mutating the request (used for optional auth headers). */
export const validateResult = <T>(schema: ZodSchema, data: unknown): T =>
  parse(schema, data, 'body') as T;
