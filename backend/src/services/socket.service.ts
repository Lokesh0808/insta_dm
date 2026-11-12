import { Server as SocketServer, type Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { logger } from '../config/logger';
import { verifyAccessToken } from '../utils/jwt';

let io: SocketServer | null = null;

interface AuthedSocket extends Socket {
  data: {
    userId: string;
    workspaceId: string;
    email: string;
    platformRole: string;
  };
}

export const initSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') ?? '*',
      credentials: true,
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.headers.authorization as string | undefined)?.replace('Bearer ', '');
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.workspaceId = payload.workspaceId;
      socket.data.email = payload.email;
      socket.data.platformRole = payload.role;
      return next();
    } catch {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const authed = socket as AuthedSocket;
    logger.debug({ userId: authed.data.userId }, 'socket connected');
    void authed.join(`workspace:${authed.data.workspaceId}`);
    void authed.join(`user:${authed.data.userId}`);

    socket.on('subscribe:conversation', (conversationId: string) => {
      void authed.join(`conversation:${conversationId}`);
    });

    socket.on('unsubscribe:conversation', (conversationId: string) => {
      void authed.leave(`conversation:${conversationId}`);
    });

    socket.on('disconnect', () => {
      logger.debug({ userId: authed.data.userId }, 'socket disconnected');
    });
  });

  logger.info('socket.io initialised');
  return io;
};

/** Emits an event to every socket in a workspace room. */
export const emitToWorkspace = (workspaceId: string, event: string, payload: unknown): void => {
  if (!io) return;
  io.to(`workspace:${workspaceId}`).emit(event, payload);
};

/** Emits an event to a single conversation room. */
export const emitToConversation = (conversationId: string, event: string, payload: unknown): void => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit(event, payload);
};

/** Emits an event to a specific user (across their workspaces). */
export const emitToUser = (userId: string, event: string, payload: unknown): void => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
};

export const getIO = (): SocketServer | null => io;
