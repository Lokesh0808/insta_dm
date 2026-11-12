import { Notification, type INotification } from '../models/Notification';
import { emitToWorkspace } from './socket.service';
import type { NotificationType } from '../types/enums';

export const createNotification = async (params: {
  workspaceId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  meta?: Record<string, unknown>;
}): Promise<INotification> => {
  const notification = await Notification.create({
    workspace: params.workspaceId,
    user: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    severity: params.severity ?? 'info',
    link: params.link,
    meta: params.meta ?? {},
  });

  emitToWorkspace(params.workspaceId, 'notification:new', {
    id: notification._id.toString(),
    title: notification.title,
    message: notification.message,
    severity: notification.severity,
    type: notification.type,
    createdAt: notification.createdAt,
  });

  return notification;
};

export const listNotifications = async (workspaceId: string, userId?: string, limit = 30) => {
  const filter: Record<string, unknown> = { workspace: workspaceId };
  if (userId) filter.$or = [{ user: userId }, { user: { $exists: false } }];
  return Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
};

export const markNotificationRead = async (workspaceId: string, id: string, userId?: string) => {
  const filter: Record<string, unknown> = { _id: id, workspace: workspaceId };
  if (userId) filter.$or = [{ user: userId }, { user: { $exists: false } }];
  await Notification.updateOne(filter, { $set: { readAt: new Date() } });
};

export const markAllNotificationsRead = async (workspaceId: string, userId?: string) => {
  const filter: Record<string, unknown> = { workspace: workspaceId, readAt: { $exists: false } };
  if (userId) filter.$or = [{ user: userId }, { user: { $exists: false } }];
  await Notification.updateMany(filter, { $set: { readAt: new Date() } });
};
