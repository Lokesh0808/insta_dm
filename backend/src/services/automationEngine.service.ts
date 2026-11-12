import { Automation, type IAutomation } from '../models/Automation';
import { AutomationExecution, type IAutomationExecution } from '../models/AutomationExecution';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { InstagramAccount } from '../models/InstagramAccount';
import { Lead } from '../models/Lead';
import {
  findMatchingAutomation,
  renderTemplate,
  triggerTypeToAutomationType,
} from './automation.service';
import { extendMessagingWindow, sendInstagramMessage } from './messaging.service';
import { createLeadFromEngagement } from './lead.service';
import { recordUsage, checkUsageLimit } from './usage.service';
import { emitToWorkspace } from './socket.service';
import { logger } from '../config/logger';
import { enqueueAutomationJob } from '../jobs/automation.queue';

export interface InboundEvent {
  workspaceId: string;
  instagramAccountId: string;
  igUserId: string;
  igUsername?: string;
  displayName?: string;
  text: string;
  externalId?: string;
  sourceId: string;
  triggerType: 'KEYWORD' | 'COMMENT' | 'STORY_REPLY' | 'FOLLOW' | 'MESSAGE_RECEIVED';
  mediaId?: string;
  commentId?: string;
}

/**
 * Entry point for every inbound Instagram engagement.
 * Handles conversation bookkeeping, rule matching and job enqueueing.
 */
export const processInboundEvent = async (event: InboundEvent): Promise<IAutomationExecution> => {
  const { workspaceId, instagramAccountId, igUserId, text, sourceId, triggerType } = event;

  // --- Idempotency ---------------------------------------------------------
  const existing = await AutomationExecution.findOne({ workspace: workspaceId, sourceId });
  if (existing) {
    logger.debug({ sourceId }, 'duplicate inbound event ignored');
    return existing;
  }

  // --- Usage guard ----------------------------------------------------------
  const usageCheck = await checkUsageLimit(workspaceId, 'automation_events');
  if (!usageCheck.allowed) {
    logger.warn({ workspaceId, limit: usageCheck.limit }, 'automation event limit reached');
  }

  const account = await InstagramAccount.findOne({
    _id: instagramAccountId,
    workspace: workspaceId,
  });
  if (!account) throw new Error('Instagram account not found for workspace');
  if (account.settings?.pauseAutomations) {
    logger.info({ instagramAccountId }, 'automations paused for account');
  }

  // --- Conversation ---------------------------------------------------------
  const conversation = await Conversation.findOneAndUpdate(
    { workspace: workspaceId, instagramAccount: instagramAccountId, igUserId },
    {
      $set: {
        igUsername: event.igUsername ?? account.username,
        displayName: event.displayName,
        lastMessage: text,
        lastMessageAt: new Date(),
        lastMessageFrom: 'inbound',
        messagingWindowExpiresAt: extendMessagingWindow(),
      },
      $inc: { unreadCount: 1 },
      $setOnInsert: { isAutomated: false },
    },
    { new: true, upsert: true },
  );

  if (event.externalId) {
    await Message.updateOne(
      { workspace: workspaceId, externalId: event.externalId },
      {
        $setOnInsert: {
          workspace: workspaceId,
          conversation: conversation._id,
          instagramAccount: instagramAccountId,
          direction: 'inbound',
          body: text,
          status: 'received',
          externalId: event.externalId,
          sentAt: new Date(),
        },
      },
      { upsert: true },
    );
  }

  // --- Rule matching -------------------------------------------------------
  const match = await findMatchingAutomation({
    workspaceId,
    instagramAccountId,
    text,
    triggerType,
  });

  const automation = match.matched
    ? await Automation.findOne({ _id: (await findAutomationId(match.matchedRule)) })
    : null;

  const execution = await AutomationExecution.create({
    workspace: workspaceId,
    automation: automation?._id,
    instagramAccount: instagramAccountId,
    triggerType,
    triggerKeyword: match.matchedKeyword,
    igUserId,
    igUsername: event.igUsername,
    sourceId,
    status: usageCheck.allowed ? 'queued' : 'skipped',
    step: match.matched ? 'matched' : 'no-match',
    matchedRule: match.matchedRule,
    meta: {
      mediaId: event.mediaId,
      commentId: event.commentId,
      limitExceeded: !usageCheck.allowed,
    },
  });

  await recordUsage(workspaceId, 'automation_events');

  if (!match.matched) {
    // Fallback message from the workspace settings when nothing matched.
    const fallback = await resolveFallbackMessage(workspaceId);
    if (fallback) {
      await enqueueAutomationJob({
        workspaceId,
        instagramAccountId,
        conversationId: conversation._id.toString(),
        executionId: execution._id.toString(),
        igUserId,
        igUsername: event.igUsername,
        text: fallback,
        isFallback: true,
        triggerType,
      });
    }
    return execution;
  }

  await enqueueAutomationJob({
    workspaceId,
    instagramAccountId,
    conversationId: conversation._id.toString(),
    executionId: execution._id.toString(),
    igUserId,
    igUsername: event.igUsername,
    text,
    triggerKeyword: match.matchedKeyword,
    triggerType,
    automationId: automation?._id?.toString(),
    delaySeconds: automation?.triggers?.find((t) => t.type === triggerType)?.delaySeconds ?? 0,
  });

  return execution;
};

/** Resolves the automation id encoded in the matched-rule descriptor. */
const findAutomationId = async (matchedRule?: string): Promise<string | undefined> => {
  if (!matchedRule) return undefined;
  const name = matchedRule.split(' → ')[0];
  const automation = await Automation.findOne({ name }).select('_id').lean();
  return automation?._id?.toString();
};

const resolveFallbackMessage = async (workspaceId: string): Promise<string | undefined> => {
  const { getWorkspace } = await import('./workspace.service');
  try {
    const workspace = await getWorkspace(workspaceId);
    return workspace.settings?.fallbackMessage;
  } catch {
    return undefined;
  }
};

export interface AutomationJobPayload {
  workspaceId: string;
  instagramAccountId: string;
  conversationId: string;
  executionId: string;
  igUserId: string;
  igUsername?: string;
  text: string;
  triggerKeyword?: string;
  triggerType: string;
  automationId?: string;
  delaySeconds?: number;
  isFallback?: boolean;
  buttons?: Array<{ type: 'web_url' | 'quick_reply'; title: string; payload?: string; url?: string }>;
  collectLead?: boolean;
  leadTags?: string[];
  workflow?: { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> };
}

/**
 * Executes the reply for a matched automation: renders the template, sends the
 * message, records the lead and updates statistics.
 */
export const executeAutomation = async (payload: AutomationJobPayload): Promise<void> => {
  const execution = await AutomationExecution.findById(payload.executionId);
  if (!execution) return;
  if (execution.status === 'success') return;

  const startedAt = Date.now();
  execution.status = 'running';
  execution.step = 'sending';
  await execution.save();

  try {
    const automation = payload.automationId
      ? await Automation.findById(payload.automationId)
      : null;

    const context = {
      username: payload.igUsername ?? 'there',
      ig_username: payload.igUsername ?? '',
      keyword: payload.triggerKeyword ?? '',
      trigger: payload.triggerType,
    };

    let messageBody = renderTemplate(payload.text ?? '', context);
    if (!messageBody.trim()) {
      throw new Error('Rendered message is empty');
    }

    const buttons =
      payload.buttons ??
      (automation?.buttons?.length ? automation.buttons : undefined);

    const conversation = await Conversation.findById(payload.conversationId);

    await sendInstagramMessage({
      workspaceId: payload.workspaceId,
      instagramAccountId: payload.instagramAccountId,
      recipientId: payload.igUserId,
      text: messageBody,
      buttons,
      conversationId: payload.conversationId,
      automationId: payload.automationId,
      messagingWindowExpiresAt: conversation?.messagingWindowExpiresAt,
    });

    execution.status = 'success';
    execution.step = 'completed';
    execution.messageSent = messageBody;
    execution.durationMs = Date.now() - startedAt;
    await execution.save();

    if (automation) {
      await Automation.updateOne(
        { _id: automation._id },
        {
          $inc: { 'stats.triggered': 1, 'stats.succeeded': 1 },
          $set: { 'stats.lastTriggeredAt': new Date() },
        },
      );
    }

    await recordUsage(payload.workspaceId, 'messages_sent');

    // --- Lead capture -------------------------------------------------------
    const shouldCollectLead =
      payload.collectLead ?? automation?.collectLead ?? false;
    if (shouldCollectLead) {
      const lead = await createLeadFromEngagement({
        workspaceId: payload.workspaceId,
        instagramAccountId: payload.instagramAccountId,
        igUserId: payload.igUserId,
        igUsername: payload.igUsername,
        source: automation?.type === 'COMMENT_DM' ? 'comment_dm' : 'keyword_dm',
        automationId: payload.automationId,
        conversationId: payload.conversationId,
        executionId: execution._id.toString(),
        tags: payload.leadTags ?? automation?.leadTags ?? [],
      });
      if (lead) {
        execution.lead = lead._id;
        await execution.save();
        if (automation) {
          await Automation.updateOne({ _id: automation._id }, { $inc: { 'stats.leads': 1 } });
        }
      }
    }

    emitToWorkspace(payload.workspaceId, 'automation:executed', {
      executionId: execution._id.toString(),
      automationId: payload.automationId,
      status: 'success',
      igUsername: payload.igUsername,
      message: messageBody,
    });

    emitToWorkspace(payload.workspaceId, 'conversation:updated', {
      conversationId: payload.conversationId,
      lastMessage: messageBody,
      lastMessageAt: new Date(),
    });
  } catch (error) {
    const err = error as Error;
    execution.status = 'failed';
    execution.step = 'failed';
    execution.error = err.message;
    execution.durationMs = Date.now() - startedAt;
    await execution.save();

    if (payload.automationId) {
      await Automation.updateOne(
        { _id: payload.automationId },
        { $inc: { 'stats.failed': 1 }, $set: { lastError: err.message } },
      );
    }

    emitToWorkspace(payload.workspaceId, 'automation:executed', {
      executionId: execution._id.toString(),
      status: 'failed',
      error: err.message,
    });

    logger.error({ err: err.message, executionId: payload.executionId }, 'automation failed');
    throw error;
  }
};

/** Maps an automation type to the trigger type used by the webhook router. */
export const automationTriggerType = (type: string): string => {
  const map: Record<string, string> = {
    KEYWORD_DM: 'KEYWORD',
    COMMENT_DM: 'COMMENT',
    STORY_REPLY: 'STORY_REPLY',
    WELCOME_DM: 'MESSAGE_RECEIVED',
    FOLLOW_DM: 'FOLLOW',
    WORKFLOW: 'MESSAGE_RECEIVED',
  };
  return map[type] ?? 'MESSAGE_RECEIVED';
};

export { triggerTypeToAutomationType };
