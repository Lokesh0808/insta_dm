import type { Request, Response } from 'express';
import { User } from '../models/User';
import { Workspace } from '../models/Workspace';
import { Subscription } from '../models/Subscription';
import { Payment } from '../models/Payment';
import { AutomationExecution } from '../models/AutomationExecution';
import { Usage } from '../models/Usage';
import { InstagramAccount } from '../models/InstagramAccount';
import { Conversation } from '../models/Conversation';
import { Lead } from '../models/Lead';
import { asyncHandler, buildPaginationMeta, escapeRegex, getPagination } from '../utils/helpers';
import { NotFoundError } from '../utils/errors';
import { getAdminOverview } from '../services/analytics.service';
import { getPlan } from '../services/plan.service';
import { mongoose } from '../utils/mongo';

export const overview = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getAdminOverview();
  res.json({ success: true, data });
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = {};

  if (req.query.search) {
    const rx = { $regex: escapeRegex(req.query.search), $options: 'i' };
    filter.$or = [{ name: rx }, { email: rx }];
  }
  if (req.query.platformRole) filter.platformRole = req.query.platformRole;
  if (req.query.isSuspended !== undefined) {
    filter.isSuspended = req.query.isSuspended === 'true';
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .populate('workspace', 'name slug plan')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      users: users.map((user: any) => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        platformRole: user.platformRole,
        isEmailVerified: user.isEmailVerified,
        isSuspended: user.isSuspended,
        suspendedReason: user.suspendedReason,
        lastLoginAt: user.lastLoginAt,
        lastActiveAt: user.lastActiveAt,
        createdAt: user.createdAt,
        workspace: user.workspace
          ? { id: user.workspace._id.toString(), name: user.workspace.name, slug: user.workspace.slug }
          : null,
      })),
      meta: buildPaginationMeta(total, page, limit),
    },
  });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new NotFoundError('User not found');

  if (req.body.isSuspended !== undefined) {
    user.isSuspended = req.body.isSuspended;
    user.suspendedReason = req.body.isSuspended ? req.body.suspendedReason : undefined;
    user.suspendedAt = req.body.isSuspended ? new Date() : undefined;
  }
  if (req.body.platformRole) {
    user.platformRole = req.body.platformRole;
  }
  await user.save();

  if (req.body.plan) {
    const plan = getPlan(req.body.plan);
    await Subscription.findOneAndUpdate(
      { workspace: user.workspace },
      {
        $set: {
          plan: req.body.plan,
          status: req.body.status ?? 'active',
          price: plan.priceMonthly,
          planSnapshot: {
            instagramAccounts: plan.instagramAccounts,
            activeAutomations: plan.activeAutomations,
            automationEventsPerMonth: plan.automationEventsPerMonth,
            features: plan.features,
          },
        },
      },
    );
  }

  res.json({ success: true, data: { user: user.toJSON() } });
});

export const listSubscriptions = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = {};

  if (req.query.plan) filter.plan = req.query.plan;
  if (req.query.status) filter.status = req.query.status;

  const [subscriptions, total] = await Promise.all([
    Subscription.find(filter)
      .populate('workspace', 'name slug owner')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Subscription.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      subscriptions: subscriptions.map((sub: any) => ({
        id: sub._id.toString(),
        plan: sub.plan,
        status: sub.status,
        billingCycle: sub.billingCycle,
        price: sub.price,
        currency: sub.currency,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        usage: sub.usage,
        workspace: sub.workspace
          ? { id: sub.workspace._id.toString(), name: sub.workspace.name, slug: sub.workspace.slug }
          : null,
        createdAt: sub.createdAt,
      })),
      meta: buildPaginationMeta(total, page, limit),
    },
  });
});

export const listPayments = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.plan) filter.plan = req.query.plan;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('workspace', 'name slug')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      payments: payments.map((payment: any) => ({
        id: payment._id.toString(),
        plan: payment.plan,
        billingCycle: payment.billingCycle,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        invoiceNumber: payment.invoiceNumber,
        razorpayPaymentId: payment.razorpayPaymentId,
        paidAt: payment.paidAt,
        workspace: payment.workspace?.name,
        user: payment.user ? { name: payment.user.name, email: payment.user.email } : null,
        createdAt: payment.createdAt,
      })),
      meta: buildPaginationMeta(total, page, limit),
    },
  });
});

export const usageMonitor = asyncHandler(async (req: Request, res: Response) => {
  const [usages, executions, accounts, conversations, leads] = await Promise.all([
    Usage.find({}).sort({ updatedAt: -1 }).limit(200).lean(),
    AutomationExecution.countDocuments(),
    InstagramAccount.countDocuments(),
    Conversation.countDocuments(),
    Lead.countDocuments(),
  ]);

  res.json({
    success: true,
    data: {
      counters: { executions, accounts, conversations, leads },
      usage: usages.map((u) => ({
        id: u._id.toString(),
        workspace: u.workspace.toString(),
        metric: u.metric,
        period: u.period,
        count: u.count,
        limit: u.limit,
      })),
    },
  });
});

export const systemHealth = asyncHandler(async (_req: Request, res: Response) => {
  const mongoState = mongoose.connection.readyState;
  const { redis } = await import('../config/redis');

  const mem = process.memoryUsage();
  const uptime = process.uptime();

  res.json({
    success: true,
    data: {
      status: 'ok',
      uptimeSeconds: Math.round(uptime),
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      },
      services: {
        mongodb: mongoState === 1 ? 'connected' : 'disconnected',
        redis: redis.status,
        api: 'running',
      },
      node: process.version,
      environment: process.env.NODE_ENV,
    },
  });
});

export const listWorkspaces = asyncHandler(async (_req: Request, res: Response) => {
  const workspaces = await Workspace.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json({
    success: true,
    data: {
      workspaces: workspaces.map((w) => ({
        id: w._id.toString(),
        name: w.name,
        slug: w.slug,
        instagramAccounts: w.instagramAccounts,
        members: w.members?.length ?? 0,
        isActive: w.isActive,
        createdAt: w.createdAt,
      })),
    },
  });
});
