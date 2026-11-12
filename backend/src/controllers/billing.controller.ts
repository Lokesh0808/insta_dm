import type { Request, Response } from 'express';
import {
  activateSubscription,
  cancelSubscription,
  createOrder,
  downgradeSubscription,
  getSubscription,
  handleRazorpayWebhook,
  listBillingHistory,
  resolvePlanPrice,
  verifyPayment,
} from '../services/billing.service';
import { PLANS, PLAN_ORDER } from '../services/plan.service';
import { asyncHandler } from '../utils/helpers';
import { BadRequestError } from '../utils/errors';
import { getUsageSnapshot } from '../services/usage.service';

export const plans = asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      plans: PLAN_ORDER.map((id) => ({
        ...PLANS[id],
        priceMonthly: PLANS[id].priceMonthly,
        priceYearly: PLANS[id].priceYearly,
      })),
    },
  });
});

export const createOrderHandler = asyncHandler(async (req: Request, res: Response) => {
  const order = await createOrder({
    workspaceId: req.auth!.workspaceId,
    userId: req.auth!.userId,
    plan: req.body.plan,
    billingCycle: req.body.billingCycle,
  });
  res.json({ success: true, data: { order } });
});

export const verifyPaymentHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await verifyPayment({
    workspaceId: req.auth!.workspaceId,
    userId: req.auth!.userId,
    razorpayOrderId: req.body.razorpayOrderId,
    razorpayPaymentId: req.body.razorpayPaymentId,
    razorpaySignature: req.body.razorpaySignature,
    plan: req.body.plan,
    billingCycle: req.body.billingCycle,
  });

  res.json({
    success: true,
    data: {
      subscription: {
        plan: result.subscription.plan,
        status: result.subscription.status,
        billingCycle: result.subscription.billingCycle,
        currentPeriodEnd: result.subscription.currentPeriodEnd,
      },
      payment: {
        id: result.payment.id,
        amount: result.payment.amount,
        currency: result.payment.currency,
        method: result.payment.method,
      },
    },
  });
});

export const webhookHandler = asyncHandler(async (req: Request, res: Response) => {
  const rawBody = (req as any).rawBody ?? JSON.stringify(req.body);
  const signature = req.header('x-razorpay-signature');
  await handleRazorpayWebhook(rawBody, signature, req.body);
  res.json({ success: true, message: 'Webhook processed' });
});

export const subscription = asyncHandler(async (req: Request, res: Response) => {
  const [sub, usage] = await Promise.all([
    getSubscription(req.auth!.workspaceId),
    getUsageSnapshot(req.auth!.workspaceId),
  ]);

  res.json({
    success: true,
    data: {
      subscription: {
        plan: sub.plan,
        status: sub.status,
        billingCycle: sub.billingCycle,
        price: sub.price,
        currency: sub.currency,
        planSnapshot: sub.planSnapshot,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        razorpaySubscriptionId: sub.razorpaySubscriptionId,
      },
      usage,
    },
  });
});

export const history = asyncHandler(async (req: Request, res: Response) => {
  const payments = await listBillingHistory(req.auth!.workspaceId);
  res.json({ success: true, data: { payments } });
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const sub = await cancelSubscription(req.auth!.workspaceId);
  res.json({
    success: true,
    message: 'Subscription will end at the close of the current billing period',
    data: { subscription: { plan: sub.plan, cancelAtPeriodEnd: sub.cancelAtPeriodEnd } },
  });
});

export const downgrade = asyncHandler(async (req: Request, res: Response) => {
  const plan = req.body.plan as keyof typeof PLANS;
  if (!PLANS[plan]) throw new BadRequestError('Unknown plan');
  const sub = await downgradeSubscription({
    workspaceId: req.auth!.workspaceId,
    userId: req.auth!.userId,
    plan: plan as keyof typeof PLANS,
    billingCycle: req.body.billingCycle ?? 'monthly',
  });
  res.json({ success: true, data: { subscription: { plan: sub.plan, status: sub.status } } });
});

export const quote = asyncHandler(async (req: Request, res: Response) => {
  const plan = req.body.plan as keyof typeof PLANS;
  const cycle = req.body.billingCycle ?? 'monthly';
  if (!PLANS[plan]) throw new BadRequestError('Unknown plan');
  res.json({
    success: true,
    data: {
      plan,
      billingCycle: cycle,
      amount: resolvePlanPrice(plan, cycle),
      currency: PLANS[plan].currency,
    },
  });
});

export const activateManually = asyncHandler(async (req: Request, res: Response) => {
  // Development-only helper for testing the subscription flow without Razorpay.
  if (process.env.NODE_ENV === 'production') {
    throw new BadRequestError('Manual activation is disabled in production');
  }
  const plan = req.body.plan as keyof typeof PLANS;
  if (!PLANS[plan]) throw new BadRequestError('Unknown plan');
  const sub = await activateSubscription({
    workspaceId: req.auth!.workspaceId,
    userId: req.auth!.userId,
    plan,
    billingCycle: req.body.billingCycle ?? 'monthly',
    amount: resolvePlanPrice(plan, req.body.billingCycle ?? 'monthly'),
    currency: PLANS[plan].currency,
  });
  res.json({ success: true, data: { subscription: { plan: sub.plan, status: sub.status } } });
});
