import { Usage } from '../models/Usage';
import { Subscription } from '../models/Subscription';
import { getPlan } from './plan.service';
import { PlanLimitError } from '../utils/errors';
import { logger } from '../config/logger';
import type { UsageMetric } from '../types/enums';

/** Period key for monthly counters, e.g. `2026-03`. */
export const monthKey = (date = new Date()): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

/** Period key for daily counters, e.g. `2026-03-12`. */
export const dayKey = (date = new Date()): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate(),
  ).padStart(2, '0')}`;

const LIMIT_FOR_METRIC: Partial<Record<UsageMetric, (plan: ReturnType<typeof getPlan>) => number>> = {
  automation_events: (plan) => plan.automationEventsPerMonth,
  instagram_accounts: (plan) => plan.instagramAccounts,
  active_automations: (plan) => plan.activeAutomations,
};

/** Returns the effective limit for a metric given the workspace's plan. */
export const getMetricLimit = async (workspaceId: string, metric: UsageMetric): Promise<number> => {
  const subscription = await Subscription.findOne({ workspace: workspaceId }).lean();
  const plan = getPlan(subscription?.plan ?? 'free');
  const resolver = LIMIT_FOR_METRIC[metric];
  if (!resolver) return Number.MAX_SAFE_INTEGER;
  return resolver(plan);
};

/** Checks whether a metric is still within the plan limit. */
export const checkUsageLimit = async (
  workspaceId: string,
  metric: UsageMetric,
): Promise<{ allowed: boolean; used: number; limit: number }> => {
  const limit = await getMetricLimit(workspaceId, metric);
  if (limit >= Number.MAX_SAFE_INTEGER) return { allowed: true, used: 0, limit };

  const usage = await Usage.findOne({ workspace: workspaceId, metric, period: monthKey() }).lean();
  const used = usage?.count ?? 0;
  return { allowed: used < limit, used, limit };
};

/** Throws a 402 when the metric limit is exhausted. */
export const assertUsageLimit = async (workspaceId: string, metric: UsageMetric): Promise<void> => {
  const { allowed, used, limit } = await checkUsageLimit(workspaceId, metric);
  if (!allowed) {
    throw new PlanLimitError(
      `You have reached the ${metric.replace('_', ' ')} limit for your plan (${used}/${limit}). Upgrade to continue.`,
      { metric, used, limit },
    );
  }
};

/** Increments a usage counter for the current month. */
export const recordUsage = async (workspaceId: string, metric: UsageMetric, amount = 1): Promise<void> => {
  const period = monthKey();
  await Usage.updateOne(
    { workspace: workspaceId, metric, period },
    { $inc: { count: amount }, $setOnInsert: { periodType: 'month' } },
    { upsert: true },
  );
};

/** Aggregated usage snapshot for the dashboard / subscription screen. */
export const getUsageSnapshot = async (workspaceId: string) => {
  const subscription = await Subscription.findOne({ workspace: workspaceId }).lean();
  const plan = getPlan(subscription?.plan ?? 'free');
  const period = monthKey();

  const usages = await Usage.find({ workspace: workspaceId, period }).lean();
  const map = new Map(usages.map((u) => [u.metric, u.count]));

  const instagramAccounts = map.get('instagram_accounts') ?? 0;
  const activeAutomations = map.get('active_automations') ?? 0;

  return {
    plan: plan.id,
    period,
    usagePeriodStart: subscription?.usagePeriodStart,
    usagePeriodEnd: subscription?.usagePeriodEnd,
    metrics: {
      automationEvents: {
        used: map.get('automation_events') ?? 0,
        limit: plan.automationEventsPerMonth,
      },
      instagramAccounts: {
        used: instagramAccounts,
        limit: plan.instagramAccounts,
      },
      activeAutomations: {
        used: activeAutomations,
        limit:
          plan.activeAutomations >= Number.MAX_SAFE_INTEGER
            ? null
            : plan.activeAutomations,
      },
      messagesSent: { used: map.get('messages_sent') ?? 0, limit: null },
      leadsCreated: { used: map.get('leads_created') ?? 0, limit: null },
      linkClicks: { used: map.get('link_clicks') ?? 0, limit: null },
    },
    entitlements: plan.entitlements,
  };
};

/** Resets monthly counters (called by the scheduled job on period rollover). */
export const resetMonthlyUsage = async (): Promise<number> => {
  const result = await Usage.updateMany(
    { period: monthKey() },
    { $set: { count: 0 } },
  );
  logger.info({ modified: result.modifiedCount }, 'monthly usage counters reset');
  return result.modifiedCount ?? 0;
};
