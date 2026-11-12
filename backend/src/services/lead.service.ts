import { Lead, type ILead } from '../models/Lead';
import { InstagramAccount } from '../models/InstagramAccount';
import { recordUsage } from './usage.service';
import { emitToWorkspace } from './socket.service';
import { logger } from '../config/logger';
import type { LeadSource, LeadStatus } from '../types/enums';

export interface CreateLeadInput {
  workspaceId: string;
  instagramAccountId: string;
  igUserId?: string;
  igUsername: string;
  name?: string;
  email?: string;
  phone?: string;
  source: LeadSource;
  automationId?: string;
  conversationId?: string;
  executionId?: string;
  tags?: string[];
  notes?: string;
  customFields?: Record<string, unknown>;
  status?: LeadStatus;
}

/**
 * Creates (or enriches) a lead for an Instagram user.
 * Leads are unique per workspace + Instagram user id — repeated engagements
 * update the existing record instead of creating duplicates.
 */
export const createLead = async (input: CreateLeadInput): Promise<ILead> => {
  const existing = input.igUserId
    ? await Lead.findOne({ workspace: input.workspaceId, igUserId: input.igUserId })
    : null;

  if (existing) {
    existing.status = input.status ?? existing.status;
    existing.name = input.name ?? existing.name;
    existing.email = input.email ?? existing.email;
    existing.phone = input.phone ?? existing.phone;
    existing.notes = input.notes ?? existing.notes;
    existing.tags = [...new Set([...(existing.tags ?? []), ...(input.tags ?? [])])];
    if (input.customFields) {
      existing.customFields = { ...(existing.customFields ?? {}), ...input.customFields };
    }
    existing.source = input.source ?? existing.source;
    await existing.save();
    return existing;
  }

  const account = await InstagramAccount.findById(input.instagramAccountId).select(
    'username followersCount biography profilePictureUrl',
  );

  const lead = await Lead.create({
    workspace: input.workspaceId,
    instagramAccount: input.instagramAccountId,
    automation: input.automationId,
    conversation: input.conversationId,
    execution: input.executionId,
    igUsername: input.igUsername,
    igUserId: input.igUserId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    source: input.source,
    sourceAutomationId: input.automationId,
    status: input.status ?? 'new',
    tags: input.tags ?? [],
    notes: input.notes,
    customFields: input.customFields ?? {},
    profileSnapshot: {
      followersCount: account?.followersCount,
      biography: account?.biography,
      profilePictureUrl: account?.profilePictureUrl,
    },
  });

  await recordUsage(input.workspaceId, 'leads_created');

  emitToWorkspace(input.workspaceId, 'lead:created', {
    id: lead._id.toString(),
    igUsername: lead.igUsername,
    source: lead.source,
  });

  logger.info({ leadId: lead._id.toString(), workspaceId: input.workspaceId }, 'lead created');
  return lead;
};

/** Creates a lead from an automated engagement, capturing available profile data. */
export const createLeadFromEngagement = async (params: {
  workspaceId: string;
  instagramAccountId: string;
  igUserId: string;
  igUsername?: string;
  source: LeadSource;
  automationId?: string;
  conversationId?: string;
  executionId?: string;
  tags?: string[];
}): Promise<ILead | null> => {
  if (!params.igUsername) {
    logger.debug({ igUserId: params.igUserId }, 'lead skipped — no username available');
    return null;
  }
  return createLead({
    workspaceId: params.workspaceId,
    instagramAccountId: params.instagramAccountId,
    igUserId: params.igUserId,
    igUsername: params.igUsername,
    source: params.source,
    automationId: params.automationId,
    conversationId: params.conversationId,
    executionId: params.executionId,
    tags: params.tags,
  });
};

/** Public lead view — never exposes internal references. */
export const toLeadDTO = (lead: ILead) => ({
  id: lead._id.toString(),
  igUsername: lead.igUsername,
  igUserId: lead.igUserId,
  name: lead.name,
  email: lead.email,
  phone: lead.phone,
  source: lead.source,
  status: lead.status,
  tags: lead.tags,
  notes: lead.notes,
  customFields: lead.customFields,
  profileSnapshot: lead.profileSnapshot,
  instagramAccount: lead.instagramAccount?.toString(),
  automation: lead.automation?.toString(),
  createdAt: lead.createdAt,
  updatedAt: lead.updatedAt,
});
