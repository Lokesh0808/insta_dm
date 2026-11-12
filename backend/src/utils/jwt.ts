import jwt, { type SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { env, isProd } from '../config/env';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  workspaceId: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  /** Unique token id — guarantees every issued refresh token is distinct. */
  jti: string;
  type: 'refresh';
}

export function signAccessToken(payload: {
  userId: string;
  email: string;
  role: string;
  workspaceId: string;
}): string {
  const body: AccessTokenPayload = {
    sub: payload.userId,
    email: payload.email,
    role: payload.role,
    workspaceId: payload.workspaceId,
    type: 'access',
  };
  return jwt.sign(body, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    issuer: 'instaflow',
  } as SignOptions);
}

export function signRefreshToken(payload: { userId: string; sessionId: string }): string {
  const body: RefreshTokenPayload = {
    sub: payload.userId,
    sessionId: payload.sessionId,
    jti: randomUUID(),
    type: 'refresh',
  };
  return jwt.sign(body, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: 'instaflow',
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'instaflow' }) as AccessTokenPayload;
  if (decoded.type !== 'access') throw new Error('Invalid token type');
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: 'instaflow' }) as RefreshTokenPayload;
  if (decoded.type !== 'refresh') throw new Error('Invalid token type');
  return decoded;
}

export const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd || env.COOKIE_SECURE,
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const accessCookieOptions = {
  httpOnly: true,
  secure: isProd || env.COOKIE_SECURE,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 15 * 60 * 1000,
};
