import type { Request } from 'express';
import type { PlatformRole, UserRole } from './enums';

export interface AuthContext {
  userId: string;
  workspaceId: string;
  email: string;
  role: UserRole;
  platformRole: PlatformRole;
  sessionId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
      requestId?: string;
      workspaceId?: string;
      userId?: string;
    }
  }
}

export interface JwtLikePayload {
  sub: string;
  email?: string;
  role?: UserRole;
  workspaceId?: string;
}

export type { Request };
