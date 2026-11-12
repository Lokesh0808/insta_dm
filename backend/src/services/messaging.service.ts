import { metaGraph } from './meta.service';
import { getAccessToken } from './instagram.service';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { logger } from '../config/logger';
import { IntegrationError } from '../utils/errors';

export interface SendMessageOptions {
  workspaceId: string;
  instagramAccountId: string;
  recipientId: string;
  text: string;
  buttons?: Array<{ type: 'web_url' | 'quick_reply'; title: string; payload?: string; url?: string }>;
  conversationId?: string;
  automationId?: string;
  /** Pre-resolved token (avoids an extra DB read when sending many messages). */
  accessToken?: string;
  messagingWindowExpiresAt?: Date;
}

/** Instagram's standard messaging window is 24 hours from the user's last message. */
export const MESSAGING_WINDOW_HOURS = 24;

export const isWithinMessagingWindow = (expiresAt?: Date | null): boolean => {
  if (!expiresAt) return false;
  return expiresAt.getTime() > Date.now();
};

export const extendMessagingWindow = (from = new Date()): Date =>
  new Date(from.getTime() + MESSAGING_WINDOW_HOURS * 60 * 60 * 1000);

/**
 * Sends a direct message through the official Instagram Messaging API.
 * https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api
 */
export const sendInstagramMessage = async (
  options: SendMessageOptions,
): Promise<{ messageId: string }> => {
  const accessToken = options.accessToken ?? (await getAccessToken(options.instagramAccountId));

  const payload: Record<string, unknown> = {
    recipient: { id: options.recipientId },
    messaging_type: 'RESPONSE',
    message: { text: options.text },
  };

  if (options.buttons && options.buttons.length > 0) {
    const interactiveButtons = options.buttons.map((button) =>
      button.type === 'web_url'
        ? { type: 'web_url', title: button.title, url: button.url }
        : { type: 'quick_reply', title: button.title, payload: button.payload ?? button.title },
    );
    payload.message = {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: options.text,
          buttons: interactiveButtons,
        },
      },
    };
  }

  const res = await metaGraph.post<{ message_id: string }>(`/${options.instagramAccountId}/messages`, payload, {
    access_token: accessToken,
  });

  if (res.error) {
    logger.error(
      { igUserId: options.recipientId, error: res.error },
      'instagram send message failed',
    );
    throw new IntegrationError(res.error.message, 400, res.error);
  }

  const messageId = res.data?.message_id ?? '';

  if (options.conversationId) {
    await Message.create({
      workspace: options.workspaceId,
      conversation: options.conversationId,
      instagramAccount: options.instagramAccountId,
      direction: 'outbound',
      body: options.text,
      status: 'sent',
      externalId: messageId,
      automation: options.automationId,
      buttons: options.buttons ?? [],
      sentAt: new Date(),
    });

    await Conversation.updateOne(
      { _id: options.conversationId },
      {
        $set: {
          lastMessage: options.text,
          lastMessageAt: new Date(),
          lastMessageFrom: 'outbound',
          messagingWindowExpiresAt: options.messagingWindowExpiresAt ?? extendMessagingWindow(),
        },
        $inc: { unreadCount: 0 },
      },
    );
  }

  return { messageId };
};

/**
 * Sends a private reply to a comment (comment-to-DM). This is a distinct
 * Instagram API surface and requires the `instagram_manage_comments` permission.
 */
export const sendCommentPrivateReply = async (params: {
  commentId: string;
  text: string;
  accessToken: string;
}): Promise<{ messageId: string }> => {
  const res = await metaGraph.post<{ id: string }>(`/${params.commentId}/replies`, {
    message: params.text,
  }, { access_token: params.accessToken });

  if (res.error) throw new IntegrationError(res.error.message, 400, res.error);
  return { messageId: res.data?.id ?? '' };
};

/** Marks a conversation as read (clears the unread counter). */
export const markConversationRead = async (workspaceId: string, conversationId: string): Promise<void> => {
  await Conversation.updateOne(
    { _id: conversationId, workspace: workspaceId },
    { $set: { unreadCount: 0 } },
  );
};
