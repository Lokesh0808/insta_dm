import type { Request, Response } from 'express';
import { Lead } from '../models/Lead';
import { asyncHandler, buildPaginationMeta, escapeRegex, getPagination, toCsv } from '../utils/helpers';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { createLead, toLeadDTO } from '../services/lead.service';
import { getPlan } from '../services/plan.service';
import { Subscription } from '../models/Subscription';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = { workspace: req.auth!.workspaceId };

  if (req.query.status) filter.status = req.query.status;
  if (req.query.source) filter.source = req.query.source;
  if (req.query.tag) filter.tags = req.query.tag;
  if (req.query.instagramAccountId) filter.instagramAccount = req.query.instagramAccountId;
  if (req.query.search) {
    const rx = { $regex: escapeRegex(req.query.search), $options: 'i' };
    filter.$or = [{ igUsername: rx }, { name: rx }, { email: rx }, { phone: rx }];
  }

  const sortSpec = String(req.query.sort ?? '-createdAt');
  const sortField = sortSpec.replace(/^-/, '');
  const sortDir = sortSpec.startsWith('-') ? -1 : 1;

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate('instagramAccount', 'username')
      .populate('automation', 'name')
      .sort({ [sortField]: sortDir })
      .skip(skip)
      .limit(limit)
      .lean(),
    Lead.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      leads: leads.map((lead: any) => ({
        ...lead,
        id: lead._id.toString(),
        instagramAccount: lead.instagramAccount
          ? { id: lead.instagramAccount._id.toString(), username: lead.instagramAccount.username }
          : null,
        automation: lead.automation
          ? { id: lead.automation._id.toString(), name: lead.automation.name }
          : null,
      })),
      meta: buildPaginationMeta(total, page, limit),
    },
  });
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const lead = await Lead.findOne({ _id: req.params.id, workspace: req.auth!.workspaceId })
    .populate('instagramAccount', 'username profilePictureUrl')
    .populate('automation', 'name type')
    .lean();
  if (!lead) throw new NotFoundError('Lead not found');
  res.json({ success: true, data: { lead: { ...lead, id: lead._id.toString() } } });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const lead = await createLead({
    workspaceId: req.auth!.workspaceId,
    instagramAccountId: req.body.instagramAccountId,
    igUsername: req.body.igUsername,
    igUserId: req.body.igUserId,
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    source: req.body.source,
    status: req.body.status,
    tags: req.body.tags,
    notes: req.body.notes,
    customFields: req.body.customFields,
  });
  res.status(201).json({ success: true, data: { lead: toLeadDTO(lead) } });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const lead = await Lead.findOne({ _id: req.params.id, workspace: req.auth!.workspaceId });
  if (!lead) throw new NotFoundError('Lead not found');

  const { status, name, email, phone, tags, notes, customFields } = req.body;
  if (status !== undefined) lead.status = status;
  if (name !== undefined) lead.name = name;
  if (email !== undefined) lead.email = email;
  if (phone !== undefined) lead.phone = phone;
  if (tags !== undefined) lead.tags = tags;
  if (notes !== undefined) lead.notes = notes;
  if (customFields !== undefined) lead.customFields = customFields;

  await lead.save();
  res.json({ success: true, data: { lead: toLeadDTO(lead) } });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const lead = await Lead.findOneAndDelete({
    _id: req.params.id,
    workspace: req.auth!.workspaceId,
  });
  if (!lead) throw new NotFoundError('Lead not found');
  res.json({ success: true, message: 'Lead deleted' });
});

export const bulkDelete = asyncHandler(async (req: Request, res: Response) => {
  const ids: string[] = Array.isArray(req.body.ids) ? req.body.ids : [];
  const result = await Lead.deleteMany({ _id: { $in: ids }, workspace: req.auth!.workspaceId });
  res.json({ success: true, data: { deleted: result.deletedCount ?? 0 } });
});

export const listTags = asyncHandler(async (req: Request, res: Response) => {
  const tags = await Lead.distinct('tags', { workspace: req.auth!.workspaceId });
  res.json({ success: true, data: { tags } });
});

export const exportCsv = asyncHandler(async (req: Request, res: Response) => {
  const subscription = await Subscription.findOne({ workspace: req.auth!.workspaceId }).lean();
  const plan = getPlan(subscription?.plan ?? 'free');
  if (!plan.entitlements.leadExport) {
    throw new ForbiddenError('Lead export requires the Growth plan or above');
  }

  const filter: Record<string, unknown> = { workspace: req.auth!.workspaceId };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.source) filter.source = req.query.source;
  if (req.query.tag) filter.tags = req.query.tag;
  if (req.query.search) {
    const rx = { $regex: escapeRegex(req.query.search), $options: 'i' };
    filter.$or = [{ igUsername: rx }, { name: rx }, { email: rx }, { phone: rx }];
  }

  const leads = await Lead.find(filter)
    .populate('instagramAccount', 'username')
    .populate('automation', 'name')
    .sort({ createdAt: -1 })
    .limit(10_000)
    .lean();

  const headers = [
    'Instagram Username',
    'Name',
    'Email',
    'Phone',
    'Source',
    'Status',
    'Tags',
    'Instagram Account',
    'Automation',
    'Created At',
  ];

  const rows = leads.map((lead: any) => [
    lead.igUsername,
    lead.name ?? '',
    lead.email ?? '',
    lead.phone ?? '',
    lead.source,
    lead.status,
    (lead.tags ?? []).join('; '),
    lead.instagramAccount?.username ?? '',
    lead.automation?.name ?? '',
    new Date(lead.createdAt).toISOString(),
  ]);

  const csv = toCsv(headers, rows);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="instaflow-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
  );
  res.send(csv);
});
