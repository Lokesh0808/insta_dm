import type { Request, Response } from 'express';
import { InstagramAccount } from '../models/InstagramAccount';
import { WebhookEvent } from '../models/WebhookEvent';
import { metaConfig } from '../config/env';
import { logger } from '../config/logger';
import { processInboundEvent } from '../services/automationEngine.service';
import { safeCompare } from '../utils/crypto';
import { enqueueAutomationJob } from '../jobs/automation.queue';

interface MetaEntry {
  id?: string;
  time?: number;
  messaging?: MetaMessagingEvent[];
  change?: MetaChangeEvent;
}

interface MetaMessagingEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: { mid?: string; text?: string };
  postback?: { mid?: string; title?: string; payload?: string };
}

interface MetaChangeEvent {
  field?: string;
  value?: {
    id?: string;
    text?: string;
    media?: { id?: string; media_product_type?: string };
    from?: { id?: string; username?: string };
  };
}

interface InstagramWebhookBody {
  object?: string;
  entry?: MetaEntry[];
}

/**
 * Reads a query parameter that Meta may send either flat (`hub.mode`) or
 * nested (`hub[mode]`).
 */
const readHubParam = (req: Request, name: string): string | undefined => {
  const flat = (req.query as Record<string, unknown>)[name];
  if (typeof flat === 'string') return flat;

  const parts = name.split('.');
  let current: unknown = req.query;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
};

/**
 * Handles the GET verification handshake required by Meta when you subscribe
 * an app to a webhook (hub.mode / hub.verify_token / hub.challenge).
 */
export const verify = (req: Request, res: Response): void => {
  const mode = readHubParam(req, 'hub.mode');
  const token = readHubParam(req, 'hub.verify_token');
  const challenge = readHubParam(req, 'hub.challenge');

  if (mode === 'subscribe' && token && safeCompare(token, metaConfig.verifyToken)) {
    logger.info('instagram webhook verified');
    res.status(200).send(challenge ?? '');
    return;
  }

  logger.warn('instagram webhook verification failed');
  res.status(403).send('Verification failed');
};

/**
 * Entry point for every Instagram webhook delivery.
 * Always responds 200 quickly — Meta retries anything that is not a success.
 */
export const receive = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, received: true });

  try {
    const body = req.body as InstagramWebhookBody;
    if (!body?.entry?.length) return;

    for (const entry of body.entry) {
      const igUserId = entry.id ?? '';
      const account = await InstagramAccount.findOne({ igUserId });

      if (!account) {
        logger.warn({ igUserId }, 'webhook for an unknown Instagram account');
        continue;
      }

      if (entry.messaging?.length) {
        for (const messaging of entry.messaging) {
          await handleMessagingEvent(account, messaging);
        }
      }

      if (entry.change) {
        await handleChangeEvent(account, entry.change);
      }
    }
  } catch (error) {
    logger.error({ err: (error as Error).message }, 'instagram webhook processing failed');
  }
};

const handleMessagingEvent = async (
  account: any,
  messaging: MetaMessagingEvent,
): Promise<void> => {
  const senderId = messaging.sender?.id;
  if (!senderId) return;

  const text = messaging.message?.text ?? messaging.postback?.payload ?? '';
  const mid = messaging.message?.mid ?? messaging.postback?.mid;

  const sourceId = `ig_msg_${mid ?? `${senderId}_${messaging.timestamp ?? Date.now()}`}`;

  await WebhookEvent.findOneAndUpdate(
    { source: 'instagram', externalId: sourceId },
    {
      $set: {
        workspace: account.workspace,
        source: 'instagram',
        eventType: 'messaging',
        externalId: sourceId,
        status: 'received',
        payload: { accountId: account._id.toString(), senderId, text },
      },
      $setOnInsert: { attempts: 0 },
    },
    { upsert: true, new: true },
  );

  await processInboundEvent({
    workspaceId: account.workspace.toString(),
    instagramAccountId: account._id.toString(),
    igUserId: senderId,
    igUsername: undefined,
    text,
    externalId: mid,
    sourceId,
    triggerType: 'KEYWORD',
  });

  await WebhookEvent.updateOne({ source: 'instagram', externalId: sourceId }, { $set: { status: 'processed', processedAt: new Date() } });
};

const handleChangeEvent = async (account: any, change: MetaChangeEvent): Promise<void> => {
  const field = change.field;
  const value = change.value ?? {};

  if (field === 'comments') {
    const commentId = value.id ?? '';
    const sourceId = `ig_comment_${commentId}`;
    const igUserId = value.from?.id ?? '';

    await WebhookEvent.findOneAndUpdate(
      { source: 'instagram', externalId: sourceId },
      {
        $set: {
          workspace: account.workspace,
          source: 'instagram',
          eventType: 'comment',
          externalId: sourceId,
          status: 'received',
          payload: {
            accountId: account._id.toString(),
            commentId,
            text: value.text,
            mediaId: value.media?.id,
            from: value.from,
          },
        },
        $setOnInsert: { attempts: 0 },
      },
      { upsert: true, new: true },
    );

    const { Automation } = await import('../models/Automation');
    const { Conversation } = await import('../models/Conversation');

    const matching = await Automation.find({
      workspace: account.workspace,
      instagramAccount: account._id,
      isActive: true,
      type: 'COMMENT_DM',
    }).lean();

    let handled = false;

    for (const automation of matching) {
      const trigger = (automation.triggers ?? []).find((t) => t.type === 'COMMENT');
      if (!trigger || trigger.enabled === false) continue;

      const mediaIds = trigger.mediaIds ?? [];
      const commentMediaId = value.media?.id;
      const isTrackedPost = mediaIds.length === 0 || (commentMediaId ? mediaIds.includes(commentMediaId) : false);
      if (!isTrackedPost) continue;

      const { matchesKeyword } = await import('../services/automation.service');
      const keywords = trigger.keywords ?? [];
      const keywordHit = keywords.find((keyword) =>
        matchesKeyword(value.text ?? '', keyword, trigger.matchType ?? 'PARTIAL', trigger.caseSensitive ?? false),
      );
      if (!keywordHit) continue;

      const conversation = await Conversation.findOneAndUpdate(
        {
          workspace: account.workspace,
          instagramAccount: account._id,
          igUserId,
        },
        {
          $set: {
            igUsername: value.from?.username,
            lastMessage: value.text,
            lastMessageAt: new Date(),
            lastMessageFrom: 'inbound',
          },
          $setOnInsert: { isAutomated: false },
        },
        { new: true, upsert: true },
      );

      const { AutomationExecution } = await import('../models/AutomationExecution');
      const execution = await AutomationExecution.findOneAndUpdate(
        { workspace: account.workspace, sourceId },
        {
          $set: {
            automation: automation._id,
            instagramAccount: account._id,
            triggerType: 'COMMENT',
            triggerKeyword: keywordHit,
            igUserId,
            igUsername: value.from?.username,
            status: 'queued',
            step: 'matched',
            matchedRule: `${automation.name} → ${keywordHit}`,
            meta: { mediaId: commentMediaId, commentId },
          },
          $setOnInsert: { workspace: account.workspace },
        },
        { upsert: true, new: true },
      );

      await enqueueAutomationJob({
        workspaceId: account.workspace.toString(),
        instagramAccountId: account._id.toString(),
        conversationId: conversation._id.toString(),
        executionId: execution._id.toString(),
        igUserId,
        igUsername: value.from?.username,
        text: automation.message ?? 'Thanks for commenting! Here is the link you asked for.',
        triggerKeyword: keywordHit,
        triggerType: 'COMMENT',
        automationId: automation._id.toString(),
        delaySeconds: trigger.delaySeconds ?? 0,
        buttons: automation.buttons?.length ? automation.buttons : undefined,
        collectLead: automation.collectLead,
        leadTags: automation.leadTags,
      });

      handled = true;
      break; // only the first matching automation handles the comment
    }

    await WebhookEvent.updateOne(
      { source: 'instagram', externalId: sourceId },
      { $set: { status: handled ? 'processed' : 'ignored', processedAt: new Date() } },
    );
    return;
  }

  if (field === 'follows') {
    const sourceId = `ig_follow_${account._id}_${value.from?.id ?? Date.now()}`;
    logger.info({ accountId: account._id.toString(), userId: value.from?.id }, 'instagram follow event');

    await WebhookEvent.findOneAndUpdate(
      { source: 'instagram', externalId: sourceId },
      {
        $set: {
          workspace: account.workspace,
          source: 'instagram',
          eventType: 'follow',
          externalId: sourceId,
          status: 'processed',
          processedAt: new Date(),
          payload: { accountId: account._id.toString(), from: value.from },
        },
      },
      { upsert: true, new: true },
    );
  }
};
