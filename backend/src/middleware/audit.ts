import type { RequestHandler } from 'express';
import { AuditLog } from '../models/AuditLog';
import { logger } from '../config/logger';

export interface AuditOptions {
  action: string;
  resource?: string;
  getResourceId?: (req: import('express').Request) => string | undefined;
  getMeta?: (req: import('express').Request) => Record<string, unknown>;
}

/**
 * Records security-relevant actions in a dedicated audit collection.
 * Failures are swallowed — auditing must never break the request.
 */
export const audit = (options: AuditOptions): RequestHandler => {
  return (req, res, next) => {
    res.on('finish', () => {
      const success = res.statusCode < 400;
      void AuditLog.create({
        workspace: req.auth?.workspaceId,
        actor: req.auth?.userId,
        actorEmail: req.auth?.email,
        action: options.action,
        resource: options.resource,
        resourceId: options.getResourceId?.(req),
        ipAddress: req.ip,
        userAgent: req.header('user-agent'),
        status: success ? 'success' : 'failure',
        meta: {
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          ...(options.getMeta?.(req) ?? {}),
        },
      }).catch((err) => logger.error({ err: err.message }, 'audit log write failed'));
    });
    next();
  };
};
