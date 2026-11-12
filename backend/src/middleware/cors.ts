import type { RequestHandler } from 'express';
import { corsOrigins } from '../config/env';
import { ForbiddenError } from '../utils/errors';

const ALLOWED_METHODS = 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS';
const ALLOWED_HEADERS =
  'Content-Type,Authorization,X-CSRF-Token,X-Visitor-Id,X-Requested-With,Accept,Origin';

const hostnameOf = (value: string): string => {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return '';
  }
};

/**
 * True when the request `Origin` points at the very host that served the app.
 *
 * This matters because the bundled Nginx reverse proxy serves the SPA and the
 * API from the same origin, yet browsers still send an `Origin` header on
 * state-changing requests. Without this check the application would refuse to
 * work on any hostname that is not explicitly listed in `CORS_ORIGINS`
 * (for example `http://127.0.0.1`, a server IP or a custom domain).
 */
export const isSameOrigin = (origin: string, hostHeader?: string): boolean => {
  if (!hostHeader) return false;
  const originHost = hostnameOf(origin);
  const requestHost = hostnameOf(`http://${hostHeader}`);
  if (!originHost || !requestHost) return false;
  return originHost === requestHost;
};

/** Returns the origin that may be reflected back, or `null` when disallowed. */
export const resolveAllowedOrigin = (
  origin: string | undefined,
  hostHeader?: string,
): string | null => {
  // No Origin header — not a browser cross-origin request (curl, server-to-server).
  if (!origin) return null;

  if (corsOrigins.includes('*')) return origin;

  const normalised = origin.replace(/\/$/, '');
  if (corsOrigins.some((allowed) => allowed.replace(/\/$/, '') === normalised)) return origin;

  if (isSameOrigin(origin, hostHeader)) return origin;

  return null;
};

/**
 * CORS handling with credential support and same-origin awareness.
 * Disallowed origins are rejected with a clear 403 instead of a generic 500.
 */
export const corsMiddleware: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin;
  const allowed = resolveAllowedOrigin(origin, req.headers.host);

  if (origin && !allowed) {
    next(new ForbiddenError(`Origin "${origin}" is not allowed to call this API`));
    return;
  }

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id');
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
    res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(204).end();
    return;
  }

  next();
};
