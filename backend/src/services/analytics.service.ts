import mongoose from 'mongoose';
import { Automation } from '../models/Automation';
import { AutomationExecution } from '../models/AutomationExecution';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Lead } from '../models/Lead';
import { InstagramAccount } from '../models/InstagramAccount';
import { LinkInBio } from '../models/LinkInBio';
import { Subscription } from '../models/Subscription';
import { Usage } from '../models/Usage';
import { monthKey } from './usage.service';

export interface DateRange {
  from: Date;
  to: Date;
}

export const resolveRange = (query: Record<string, unknown>): DateRange => {
  const now = new Date();
  const days = Number(query.days ?? query.range ?? 30);
  const safeDays = [7, 30, 90, 365].includes(days) ? days : 30;
  const from = new Date(now.getTime() - safeDays * 24 * 60 * 60 * 1000);
  return { from, to: now };
};

const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

/** Builds a dense (gap-free) date series so charts never have holes. */
export const buildSeries = (
  range: DateRange,
  values: Map<string, number>,
): Array<{ date: string; count: number }> => {
  const series: Array<{ date: string; count: number }> = [];
  const cursor = new Date(range.from);
  cursor.setUTCHours(0, 0, 0, 0);
  while (cursor <= range.to) {
    const key = dayKey(cursor);
    series.push({ date: key, count: values.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return series;
};

export const getOverview = async (workspaceId: string, range: DateRange) => {
  const [
    instagramAccounts,
    activeAutomations,
    totalAutomations,
    executions,
    conversations,
    leads,
    messages,
    linkInBios,
  ] = await Promise.all([
    InstagramAccount.countDocuments({ workspace: workspaceId }),
    Automation.countDocuments({ workspace: workspaceId, isActive: true }),
    Automation.countDocuments({ workspace: workspaceId }),
    AutomationExecution.find({
      workspace: workspaceId,
      createdAt: { $gte: range.from, $lte: range.to },
    })
      .select('status triggerType createdAt')
      .lean(),
    Conversation.countDocuments({ workspace: workspaceId }),
    Lead.countDocuments({ workspace: workspaceId }),
    Message.countDocuments({ workspace: workspaceId }),
    LinkInBio.countDocuments({ workspace: workspaceId }),
  ]);

  const succeeded = executions.filter((e) => e.status === 'success').length;
  const failed = executions.filter((e) => e.status === 'failed').length;
  const skipped = executions.filter((e) => e.status === 'skipped').length;
  const attempted = succeeded + failed;

  const recent = await AutomationExecution.find({ workspace: workspaceId })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('automation', 'name type')
    .populate('instagramAccount', 'username')
    .lean();

  // Daily event volume for the chart on the overview page.
  const byDay = new Map<string, number>();
  for (const execution of executions) {
    const key = dayKey(new Date(execution.createdAt));
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  return {
    cards: {
      instagramAccounts,
      activeAutomations,
      totalAutomations,
      automationEvents: executions.length,
      conversations,
      leads,
      messages,
      linkInBios,
      successRate: attempted === 0 ? 0 : Number(((succeeded / attempted) * 100).toFixed(1)),
      failedExecutions: failed,
      skippedExecutions: skipped,
    },
    daily: buildSeries(range, byDay),
    recentActivity: recent.map((r) => ({
      id: r._id.toString(),
      status: r.status,
      triggerType: r.triggerType,
      triggerKeyword: r.triggerKeyword,
      igUsername: r.igUsername,
      createdAt: r.createdAt,
      automation: r.automation
        ? { id: (r.automation as any)._id.toString(), name: (r.automation as any).name }
        : null,
      instagramAccount: r.instagramAccount
        ? { username: (r.instagramAccount as any).username }
        : null,
    })),
  };
};

export const getDmAnalytics = async (workspaceId: string, range: DateRange) => {
  const executions = await AutomationExecution.find({
    workspace: workspaceId,
    createdAt: { $gte: range.from, $lte: range.to },
  })
    .select('status triggerType triggerKeyword createdAt durationMs')
    .lean();

  const byDay = new Map<string, number>();
  const byTrigger = new Map<string, number>();
  const byKeyword = new Map<string, number>();

  for (const execution of executions) {
    const key = dayKey(new Date(execution.createdAt));
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
    byTrigger.set(execution.triggerType, (byTrigger.get(execution.triggerType) ?? 0) + 1);
    if (execution.triggerKeyword) {
      byKeyword.set(execution.triggerKeyword, (byKeyword.get(execution.triggerKeyword) ?? 0) + 1);
    }
  }

  // NOTE: `aggregate()` does not apply schema casting, so the workspace id
  // must be converted to an ObjectId explicitly.
  const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);

  const inbound = await Message.aggregate([
    {
      $match: {
        workspace: workspaceObjectId,
        direction: 'inbound',
        createdAt: { $gte: range.from, $lte: range.to },
      },
    },
    { $group: { _id: '$createdAt', count: { $sum: 1 } } },
  ]);
  const outbound = await Message.aggregate([
    {
      $match: {
        workspace: workspaceObjectId,
        direction: 'outbound',
        createdAt: { $gte: range.from, $lte: range.to },
      },
    },
    { $group: { _id: '$createdAt', count: { $sum: 1 } } },
  ]);

  const daily = buildSeries(range, byDay);
  const totalOutbound = outbound.reduce((sum, m) => sum + m.count, 0);
  const totalInbound = inbound.reduce((sum, m) => sum + m.count, 0);

  return {
    total: executions.length,
    succeeded: executions.filter((e) => e.status === 'success').length,
    failed: executions.filter((e) => e.status === 'failed').length,
    messages: { inbound: totalInbound, outbound: totalOutbound },
    daily,
    byTrigger: [...byTrigger.entries()].map(([type, count]) => ({ type, count })),
    topKeywords: [...byKeyword.entries()]
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
};

export const getLeadAnalytics = async (workspaceId: string, range: DateRange) => {
  const leads = await Lead.find({
    workspace: workspaceId,
    createdAt: { $gte: range.from, $lte: range.to },
  })
    .select('source status tags createdAt')
    .lean();

  const byDay = new Map<string, number>();
  const bySource = new Map<string, number>();
  const byStatus = new Map<string, number>();

  for (const lead of leads) {
    const key = dayKey(new Date(lead.createdAt));
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
    bySource.set(lead.source, (bySource.get(lead.source) ?? 0) + 1);
    byStatus.set(lead.status, (byStatus.get(lead.status) ?? 0) + 1);
  }

  const converted = leads.filter((l) => l.status === 'converted').length;
  const qualified = leads.filter((l) => l.status === 'qualified').length;

  return {
    total: leads.length,
    converted,
    qualified,
    conversionRate: leads.length === 0 ? 0 : Number(((converted / leads.length) * 100).toFixed(1)),
    daily: buildSeries(range, byDay),
    bySource: [...bySource.entries()].map(([source, count]) => ({ source, count })),
    byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
  };
};

export const getAdminOverview = async () => {
  const { User } = await import('../models/User');
  const { Payment } = await import('../models/Payment');
  const { Workspace } = await import('../models/Workspace');

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    activeSubscriptions,
    totalSubscriptions,
    mrr,
    automationEvents,
    totalLeads,
    totalConversations,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ lastActiveAt: { $gte: new Date(now.getTime() - 30 * 24 * 3600 * 1000) } }),
    User.countDocuments({ isSuspended: true }),
    Subscription.countDocuments({ status: { $in: ['active', 'trialing'] } }),
    Subscription.countDocuments(),
    Subscription.aggregate([
      { $match: { status: { $in: ['active', 'trialing'] } } },
      {
        $group: {
          _id: null,
          monthly: {
            $sum: {
              $cond: [
                { $eq: ['$billingCycle', 'yearly'] },
                { $divide: ['$price', 12] },
                '$price',
              ],
            },
          },
          yearly: {
            $sum: {
              $cond: [{ $eq: ['$billingCycle', 'yearly'] }, '$price', 0],
            },
          },
        },
      },
    ]),
    AutomationExecution.countDocuments(),
    Lead.countDocuments(),
    Conversation.countDocuments(),
  ]);

  const paymentsThisMonth = await Payment.aggregate([
    { $match: { status: 'captured', paidAt: { $gte: monthStart } } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);

  const usageByPeriod = await Usage.aggregate([
    { $match: { metric: 'automation_events' } },
    { $group: { _id: '$period', total: { $sum: '$count' } } },
    { $sort: { _id: 1 } },
  ]);

  return {
    totalUsers,
    activeUsers,
    suspendedUsers,
    totalWorkspaces: await Workspace.countDocuments(),
    activeSubscriptions,
    totalSubscriptions,
    mrr: mrr[0]?.monthly ?? 0,
    arr: (mrr[0]?.monthly ?? 0) * 12,
    yearlyRevenue: mrr[0]?.yearly ?? 0,
    revenueThisMonth: paymentsThisMonth[0]?.total ?? 0,
    paymentsThisMonth: paymentsThisMonth[0]?.count ?? 0,
    automationEvents,
    totalLeads,
    totalConversations,
    usageByPeriod: usageByPeriod.map((u) => ({ period: u._id, total: u.total })),
  };
};

export const getUsageHistory = async (workspaceId: string) => {
  const usages = await Usage.find({ workspace: workspaceId })
    .sort({ period: -1 })
    .limit(12)
    .lean();
  return usages.map((u) => ({
    period: u.period,
    metric: u.metric,
    count: u.count,
    limit: u.limit,
  }));
};

export const currentPeriod = () => monthKey();
