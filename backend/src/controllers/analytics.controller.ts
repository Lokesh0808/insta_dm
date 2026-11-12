import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/helpers';
import {
  getDmAnalytics,
  getLeadAnalytics,
  getOverview,
  getUsageHistory,
  resolveRange,
} from '../services/analytics.service';
import { getUsageSnapshot } from '../services/usage.service';

export const overview = asyncHandler(async (req: Request, res: Response) => {
  const range = resolveRange(req.query as Record<string, unknown>);
  const [data, usage] = await Promise.all([
    getOverview(req.auth!.workspaceId, range),
    getUsageSnapshot(req.auth!.workspaceId),
  ]);
  res.json({ success: true, data: { ...data, usage, range } });
});

export const dms = asyncHandler(async (req: Request, res: Response) => {
  const range = resolveRange(req.query as Record<string, unknown>);
  const data = await getDmAnalytics(req.auth!.workspaceId, range);
  res.json({ success: true, data: { ...data, range } });
});

export const leads = asyncHandler(async (req: Request, res: Response) => {
  const range = resolveRange(req.query as Record<string, unknown>);
  const data = await getLeadAnalytics(req.auth!.workspaceId, range);
  res.json({ success: true, data: { ...data, range } });
});

export const usage = asyncHandler(async (req: Request, res: Response) => {
  const [snapshot, history] = await Promise.all([
    getUsageSnapshot(req.auth!.workspaceId),
    getUsageHistory(req.auth!.workspaceId),
  ]);
  res.json({ success: true, data: { snapshot, history } });
});
