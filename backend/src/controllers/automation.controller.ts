import type { Request, Response } from 'express';
import { Automation } from '../models/Automation';
import { AutomationExecution } from '../models/AutomationExecution';
import { InstagramAccount } from '../models/InstagramAccount';
import { asyncHandler, buildPaginationMeta, escapeRegex, getPagination } from '../utils/helpers';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { assertUsageLimit, recordUsage } from '../services/usage.service';
import { getPlan } from '../services/plan.service';
import { Subscription } from '../models/Subscription';
import { emitToWorkspace } from '../services/socket.service';

const toDTO = (automation: any) => ({
  id: automation._id.toString(),
  name: automation.name,
  description: automation.description,
  type: automation.type,
  isActive: automation.isActive,
  priority: automation.priority,
  instagramAccount: automation.instagramAccount,
  triggers: automation.triggers,
  message: automation.message,
  fallbackMessage: automation.fallbackMessage,
  buttons: automation.buttons,
  collectLead: automation.collectLead,
  leadTags: automation.leadTags,
  workflow: automation.workflow,
  stats: automation.stats,
  lastError: automation.lastError,
  createdAt: automation.createdAt,
  updatedAt: automation.updatedAt,
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = { workspace: req.auth!.workspaceId };

  if (req.query.type) filter.type = req.query.type;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.instagramAccountId) filter.instagramAccount = req.query.instagramAccountId;
  if (req.query.search) {
    const pattern = escapeRegex(req.query.search);
    filter.$or = [
      { name: { $regex: pattern, $options: 'i' } },
      { description: { $regex: pattern, $options: 'i' } },
    ];
  }

  const sortSpec = String(req.query.sort ?? '-createdAt');
  const sortField = sortSpec.replace(/^-/, '');
  const sortDir = sortSpec.startsWith('-') ? -1 : 1;

  const [automations, total] = await Promise.all([
    Automation.find(filter)
      .populate('instagramAccount', 'username profilePictureUrl')
      .sort({ [sortField]: sortDir })
      .skip(skip)
      .limit(limit)
      .lean(),
    Automation.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      automations: automations.map(toDTO),
      meta: buildPaginationMeta(total, page, limit),
    },
  });
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const automation = await Automation.findOne({
    _id: req.params.id,
    workspace: req.auth!.workspaceId,
  })
    .populate('instagramAccount', 'username profilePictureUrl')
    .lean();
  if (!automation) throw new NotFoundError('Automation not found');
  res.json({ success: true, data: { automation: toDTO(automation) } });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const workspaceId = req.auth!.workspaceId;
  const body = req.body;

  const account = await InstagramAccount.findOne({
    _id: body.instagramAccountId,
    workspace: workspaceId,
  });
  if (!account) throw new BadRequestError('Instagram account not found in this workspace');

  if (body.isActive) {
    await assertUsageLimit(workspaceId, 'active_automations');
    await assertUsageLimit(workspaceId, 'automation_events');
  }

  const subscription = await Subscription.findOne({ workspace: workspaceId }).lean();
  const plan = getPlan(subscription?.plan ?? 'free');

  if (body.type === 'WORKFLOW' && !plan.entitlements.workflowBuilder) {
    throw new BadRequestError('The workflow builder requires the Growth plan or above');
  }

  const automation = await Automation.create({
    workspace: workspaceId,
    instagramAccount: body.instagramAccountId,
    createdBy: req.auth!.userId,
    name: body.name,
    description: body.description,
    type: body.type,
    isActive: body.isActive,
    priority: body.priority,
    triggers: body.triggers,
    message: body.message,
    fallbackMessage: body.fallbackMessage,
    buttons: body.buttons,
    collectLead: body.collectLead,
    leadTags: body.leadTags,
    workflow: body.workflow,
  });

  await recordUsage(workspaceId, 'active_automations', body.isActive ? 1 : 0);
  emitToWorkspace(workspaceId, 'automation:created', { id: automation._id.toString() });

  res.status(201).json({ success: true, data: { automation: toDTO(automation) } });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const existing = await Automation.findOne({
    _id: req.params.id,
    workspace: req.auth!.workspaceId,
  });
  if (!existing) throw new NotFoundError('Automation not found');

  const wasActive = existing.isActive;
  const allowed: Array<keyof typeof req.body> = [
    'name',
    'description',
    'isActive',
    'priority',
    'triggers',
    'message',
    'fallbackMessage',
    'buttons',
    'collectLead',
    'leadTags',
    'workflow',
    'instagramAccountId',
  ];

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      (existing as any)[key] = req.body[key];
    }
  }

  if (!wasActive && existing.isActive) {
    await assertUsageLimit(req.auth!.workspaceId, 'active_automations');
    await recordUsage(req.auth!.workspaceId, 'active_automations', 1);
  } else if (wasActive && !existing.isActive) {
    await recordUsage(req.auth!.workspaceId, 'active_automations', -1);
  }

  await existing.save();
  emitToWorkspace(req.auth!.workspaceId, 'automation:updated', { id: existing._id.toString() });

  res.json({ success: true, data: { automation: toDTO(existing) } });
});

export const toggle = asyncHandler(async (req: Request, res: Response) => {
  const automation = await Automation.findOne({
    _id: req.params.id,
    workspace: req.auth!.workspaceId,
  });
  if (!automation) throw new NotFoundError('Automation not found');

  const nextState = Boolean(req.body.isActive);
  if (nextState && !automation.isActive) {
    await assertUsageLimit(req.auth!.workspaceId, 'active_automations');
  }

  automation.isActive = nextState;
  await automation.save();
  await recordUsage(req.auth!.workspaceId, 'active_automations', nextState ? 1 : -1);

  emitToWorkspace(req.auth!.workspaceId, 'automation:updated', { id: automation._id.toString() });
  res.json({ success: true, data: { automation: toDTO(automation) } });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const automation = await Automation.findOneAndDelete({
    _id: req.params.id,
    workspace: req.auth!.workspaceId,
  });
  if (!automation) throw new NotFoundError('Automation not found');
  if (automation.isActive) await recordUsage(req.auth!.workspaceId, 'active_automations', -1);
  res.json({ success: true, message: 'Automation deleted' });
});

export const duplicate = asyncHandler(async (req: Request, res: Response) => {
  const source = await Automation.findOne({
    _id: req.params.id,
    workspace: req.auth!.workspaceId,
  }).lean();
  if (!source) throw new NotFoundError('Automation not found');

  const copy = await Automation.create({
    ...source,
    _id: undefined,
    name: `${source.name} (copy)`,
    isActive: false,
    createdAt: undefined,
    updatedAt: undefined,
    stats: { triggered: 0, succeeded: 0, failed: 0, leads: 0 },
  });

  res.status(201).json({ success: true, data: { automation: toDTO(copy) } });
});

export const listExecutions = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = { workspace: req.auth!.workspaceId };

  if (req.params.id) filter.automation = req.params.id;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.instagramAccountId) filter.instagramAccount = req.query.instagramAccountId;

  const [executions, total] = await Promise.all([
    AutomationExecution.find(filter)
      .populate('automation', 'name type')
      .populate('instagramAccount', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AutomationExecution.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      executions: executions.map((e: any) => ({
        id: e._id.toString(),
        status: e.status,
        step: e.step,
        triggerType: e.triggerType,
        triggerKeyword: e.triggerKeyword,
        igUsername: e.igUsername,
        messageSent: e.messageSent,
        error: e.error,
        durationMs: e.durationMs,
        automation: e.automation
          ? { id: e.automation._id.toString(), name: e.automation.name, type: e.automation.type }
          : null,
        instagramAccount: e.instagramAccount
          ? { username: e.instagramAccount.username }
          : null,
        createdAt: e.createdAt,
      })),
      meta: buildPaginationMeta(total, page, limit),
    },
  });
});

export const testAutomation = asyncHandler(async (req: Request, res: Response) => {
  const automation = await Automation.findOne({
    _id: req.params.id,
    workspace: req.auth!.workspaceId,
  }).lean();
  if (!automation) throw new NotFoundError('Automation not found');

  const { matchesKeyword, renderTemplate } = await import('../services/automation.service');
  const text = String(req.body.text ?? '');
  const trigger = automation.triggers?.[0];

  const matched =
    (trigger?.keywords ?? []).some((keyword) =>
      matchesKeyword(text, keyword, trigger?.matchType ?? 'PARTIAL', trigger?.caseSensitive ?? false),
    ) || automation.type !== 'KEYWORD_DM';

  res.json({
    success: true,
    data: {
      matched,
      reply: renderTemplate(automation.message ?? automation.fallbackMessage ?? '', {
        username: req.body.username ?? 'there',
        keyword: trigger?.keywords?.[0] ?? '',
      }),
      triggers: automation.triggers,
    },
  });
});
