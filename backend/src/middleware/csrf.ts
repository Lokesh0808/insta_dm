import type { RequestHandler } from 'express';
import { randomBytes } from 'crypto';
import { safeCompare } from '../utils/crypto';
import { ForbiddenError } from '../utils/errors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const CSRF_COOKIE = 'csrfToken';
export const CSRF_HEADER = 'x-csrf-token';

export const csrfToken = (req: import('express').Request): string => {
  const existing = (req.cookies as Record<string, string> | undefined)?.[CSRF_COOKIE];
  if (existing) return existing;
  const token = randomBytes(24).toString('base64url');
  res_set(req, token);
  return token;
};

// Small helper so we can attach the cookie to the response without importing it everywhere.
const res_set = (req: import('express').Request, token: string): void => {
  const res = req.res as import('express').Response | undefined;
  if (!res) return;
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  });
};

/**
 * Double-submit-cookie CSRF protection.
 * Only enforced for requests authenticated via cookies (not Bearer tokens),
 * because Bearer tokens are never sent automatically by the browser.
 */
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const authHeader = req.header('authorization');
  if (authHeader?.startsWith('Bearer ')) return next(); // stateless auth — CSRF not applicable

  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[CSRF_COOKIE];
  const headerToken = req.header(CSRF_HEADER) ?? req.body?._csrf;

  if (!cookieToken || !headerToken || !safeCompare(cookieToken, headerToken)) {
    return next(new ForbiddenError('Invalid CSRF token'));
  }
  return next();
};
