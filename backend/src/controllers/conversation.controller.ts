import type { Request, Response } from 'express';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { asyncHandler, buildPaginationMeta, escapeRegex, getPagination } from '../utils/helpers';
import { NotFoundError } from '../utils/errors';
import { markConversationRead } from '../services/messaging.service';
import { emitToWorkspace } from '../services/socket.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = { workspace: req.auth!.workspaceId };

  if (req.query.unread === 'true') filter.unreadCount = { $gt: 0 };
  if (req.query.instagramAccountId) filter.instagramAccount = req.query.instagramAccountId;
  if (req.query.search) {
    const rx = { $regex: escapeRegex(req.query.search), $options: 'i' };
    filter.$or = [{ igUsername: rx }, { displayName: rx }, { lastMessage: rx }];
  }

  const [conversations, total] = await Promise.all([
    Conversation.find(filter)
      .populate('instagramAccount', 'username profilePictureUrl')
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Conversation.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      conversations: conversations.map((c: any) => ({
        id: c._id.toString(),
        igUserId: c.igUserId,
        igUsername: c.igUsername,
        displayName: c.displayName,
        avatarUrl: c.avatarUrl,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt,
        lastMessageFrom: c.lastMessageFrom,
        unreadCount: c.unreadCount,
        isAutomated: c.isAutomated,
        status: c.status,
        tags: c.tags,
        messagingWindowExpiresAt: c.messagingWindowExpiresAt,
        instagramAccount: c.instagramAccount
          ? {
              id: c.instagramAccount._id.toString(),
              username: c.instagramAccount.username,
              profilePictureUrl: c.instagramAccount.profilePictureUrl,
            }
          : null,
      })),
      meta: buildPaginationMeta(total, page, limit),
    },
  });
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    workspace: req.auth!.workspaceId,
  })
    .populate('instagramAccount', 'username profilePictureUrl')
    .lean();
  if (!conversation) throw new NotFoundError('Conversation not found');

  const messages = await Message.find({
    conversation: conversation._id,
    workspace: req.auth!.workspaceId,
  })
    .sort({ sentAt: 1 })
    .limit(200)
    .lean();

  res.json({
    success: true,
    data: {
      conversation: {
        id: conversation._id.toString(),
        igUserId: conversation.igUserId,
        igUsername: conversation.igUsername,
        displayName: conversation.displayName,
        unreadCount: conversation.unreadCount,
        status: conversation.status,
        messagingWindowExpiresAt: conversation.messagingWindowExpiresAt,
        instagramAccount: conversation.instagramAccount,
      },
      messages: messages.map((m: any) => ({
        id: m._id.toString(),
        direction: m.direction,
        body: m.body,
        status: m.status,
        sentAt: m.sentAt,
        error: m.error,
      })),
    },
  });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  await markConversationRead(req.auth!.workspaceId, req.params.id);
  res.json({ success: true, message: 'Conversation marked as read' });
});

export const sendReply = asyncHandler(async (req: Request, res: Response) => {
  const { sendInstagramMessage } = await import('../services/messaging.service');
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    workspace: req.auth!.workspaceId,
  });
  if (!conversation) throw new NotFoundError('Conversation not found');

  const result = await sendInstagramMessage({
    workspaceId: req.auth!.workspaceId,
    instagramAccountId: conversation.instagramAccount.toString(),
    recipientId: conversation.igUserId,
    text: req.body.text,
    conversationId: conversation._id.toString(),
  });

  emitToWorkspace(req.auth!.workspaceId, 'conversation:updated', {
    conversationId: conversation._id.toString(),
    lastMessage: req.body.text,
    lastMessageAt: new Date(),
  });

  res.json({ success: true, data: { messageId: result.messageId } });
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const conversation = await Conversation.findOneAndUpdate(
    { _id: req.params.id, workspace: req.auth!.workspaceId },
    { $set: { status: req.body.status, tags: req.body.tags ?? undefined } },
    { new: true },
  );
  if (!conversation) throw new NotFoundError('Conversation not found');
  res.json({ success: true, data: { conversation } });
});
