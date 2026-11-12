import type { Request, Response } from 'express';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notification.service';
import { asyncHandler } from '../utils/helpers';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const notifications = await listNotifications(req.auth!.workspaceId, req.auth!.userId);
  res.json({
    success: true,
    data: {
      notifications: notifications.map((n) => ({
        id: n._id.toString(),
        type: n.type,
        title: n.title,
        message: n.message,
        severity: n.severity,
        link: n.link,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
    },
  });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  await markNotificationRead(req.auth!.workspaceId, req.params.id, req.auth!.userId);
  res.json({ success: true, message: 'Notification marked as read' });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await markAllNotificationsRead(req.auth!.workspaceId, req.auth!.userId);
  res.json({ success: true, message: 'All notifications marked as read' });
});
