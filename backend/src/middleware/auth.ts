import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { User } from '../models/User';
import type { PlatformRole, UserRole } from '../types/enums';
import { workspaceMemberRoles } from '../services/workspace.service';

const extractToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7).trim();
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.accessToken;
  return cookieToken ?? null;
};

/** Requires a valid access token and attaches `req.auth`. */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractToken(req);
    if (!token) throw new UnauthorizedError('Authentication token is missing');

    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.sub).select(
      'name email platformRole workspace isEmailVerified isSuspended',
    );
    if (!user) throw new UnauthorizedError('Account no longer exists');
    if (user.isSuspended) throw new ForbiddenError('This account has been suspended');

    const membership = await workspaceMemberRoles(user.workspace.toString(), user._id.toString());

    req.auth = {
      userId: user._id.toString(),
      workspaceId: user.workspace.toString(),
      email: user.email,
      role: membership.role,
      platformRole: user.platformRole,
      sessionId: '',
    };
    req.workspaceId = req.auth.workspaceId;
    req.userId = req.auth.userId;

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) return next(error);
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Invalid or expired access token'));
    }
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Access token expired'));
    }
    return next(error);
  }
};

/** Attaches `req.auth` when a token is present but never rejects the request. */
export const optionalAuthenticate: RequestHandler = async (req, res, next) => {
  if (!extractToken(req)) return next();
  return authenticate(req, res, next);
};

export const requireWorkspaceRole = (...roles: UserRole[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.auth) return next(new UnauthorizedError());
    if (!roles.includes(req.auth.role)) {
      return next(new ForbiddenError(`Requires role: ${roles.join(' or ')}`));
    }
    return next();
  };
};

export const requirePlatformRole = (...roles: PlatformRole[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.auth) return next(new UnauthorizedError());
    if (!roles.includes(req.auth.platformRole)) {
      return next(new ForbiddenError('Admin access required'));
    }
    return next();
  };
};

export const requireWorkspaceAccess =
  (resolveWorkspace: (req: Request) => string | undefined) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const target = resolveWorkspace(req);
    if (!target) return next();
    if (target !== req.auth?.workspaceId) {
      return next(new ForbiddenError('Cross-tenant access is not allowed'));
    }
    return next();
  };
