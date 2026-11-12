import { Subscription, type ISubscription } from '../models/Subscription';
import { Payment } from '../models/Payment';
import { Workspace } from '../models/Workspace';
import { User } from '../models/User';
import { getPlan, PLANS, type PlanDefinition } from './plan.service';
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  verifyRazorpaySignature,
  isRazorpayConfigured,
  razorpayKeyId,
} from './razorpay.service';
import { sendSubscriptionEmail } from './email.service';
import { createNotification } from './notification.service';
import { emitToWorkspace } from './socket.service';
import { logger } from '../config/logger';
import { SubscriptionError, BadRequestError, NotFoundError } from '../utils/errors';
import type { BillingCycle, SubscriptionPlan } from '../types/enums';
import { randomUUID } from 'crypto';

export const getSubscription = async (workspaceId: string): Promise<ISubscription> => {
  const subscription = await Subscription.findOne({ workspace: workspaceId });
  if (!subscription) {
    const created = await Subscription.create({
      workspace: workspaceId,
      plan: 'free',
      status: 'active',
      planSnapshot: {
        instagramAccounts: PLANS.free.instagramAccounts,
        activeAutomations: PLANS.free.activeAutomations,
        automationEventsPerMonth: PLANS.free.automationEventsPerMonth,
        features: PLANS.free.features,
      },
    });
    return created;
  }
  return subscription;
};

export const resolvePlanPrice = (plan: SubscriptionPlan, cycle: BillingCycle): number => {
  const definition: PlanDefinition = getPlan(plan);
  return cycle === 'yearly' ? definition.priceYearly : definition.priceMonthly;
};

/**
 * Creates a Razorpay order for the requested plan.
 * The frontend never sends an amount — it is always derived from the plan.
 */
export const createOrder = async (params: {
  workspaceId: string;
  userId: string;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
}): Promise<{
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  receipt: string;
}> => {
  if (params.plan === 'free') {
    throw new BadRequestError('The free plan does not require a payment');
  }
  if (!isRazorpayConfigured) {
    throw new SubscriptionError('Billing is not configured on this environment');
  }

  const amount = resolvePlanPrice(params.plan, params.billingCycle);
  const receipt = `rcpt_${randomUUID().replace(/-/g, '').slice(0, 24)}`;

  const order = await createRazorpayOrder({
    amount,
    currency: getPlan(params.plan).currency,
    receipt,
    notes: {
      workspaceId: params.workspaceId,
      userId: params.userId,
      plan: params.plan,
      billingCycle: params.billingCycle,
    },
  });

  return {
    orderId: order.id,
    amount,
    currency: order.currency,
    keyId: razorpayKeyId,
    plan: params.plan,
    billingCycle: params.billingCycle,
    receipt,
  };
};

/**
 * Verifies a payment on the BACKEND. The frontend's success callback is never
 * trusted: the signature is validated AND the payment is fetched from Razorpay.
 */
export const verifyPayment = async (params: {
  workspaceId: string;
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
}): Promise<{ success: boolean; subscription: ISubscription; payment: any }> => {
  if (!isRazorpayConfigured) {
    throw new SubscriptionError('Billing is not configured on this environment');
  }

  const expectedSignature = cryptoHmac(
    process.env.RAZORPAY_KEY_SECRET ?? '',
    `${params.razorpayOrderId}|${params.razorpayPaymentId}`,
  );
  if (!safeCompare(expectedSignature, params.razorpaySignature)) {
    throw new SubscriptionError('Payment signature verification failed');
  }

  // Confirm with Razorpay that the payment actually exists and was captured.
  const paymentDetails = (await fetchRazorpayPayment(params.razorpayPaymentId)) as any;
  if (!paymentDetails || paymentDetails.status !== 'captured') {
    throw new SubscriptionError('Payment has not been captured');
  }
  if (paymentDetails.order_id !== params.razorpayOrderId) {
    throw new SubscriptionError('Payment does not match the created order');
  }
  if (Number(paymentDetails.amount) !== Math.round(resolvePlanPrice(params.plan, params.billingCycle) * 100)) {
    throw new SubscriptionError('Payment amount does not match the plan price');
  }

  const subscription = await activateSubscription({
    workspaceId: params.workspaceId,
    userId: params.userId,
    plan: params.plan,
    billingCycle: params.billingCycle,
    amount: Number(paymentDetails.amount) / 100,
    currency: paymentDetails.currency ?? 'INR',
    razorpayOrderId: params.razorpayOrderId,
    razorpayPaymentId: params.razorpayPaymentId,
    razorpayInvoiceId: paymentDetails.invoice_id,
  });

  return { success: true, subscription, payment: paymentDetails };
};

/** Activates / upgrades a subscription and records the payment. */
export const activateSubscription = async (params: {
  workspaceId: string;
  userId: string;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpayInvoiceId?: string;
  razorpaySubscriptionId?: string;
}): Promise<ISubscription> => {
  const plan = getPlan(params.plan);
  const now = new Date();
  const periodEnd = new Date(now);
  if (params.billingCycle === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  const subscription = await Subscription.findOneAndUpdate(
    { workspace: params.workspaceId },
    {
      $set: {
        plan: params.plan,
        status: 'active',
        billingCycle: params.billingCycle,
        price: params.amount,
        currency: params.currency,
        planSnapshot: {
          instagramAccounts: plan.instagramAccounts,
          activeAutomations: plan.activeAutomations,
          automationEventsPerMonth: plan.automationEventsPerMonth,
          features: plan.features,
        },
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        razorpayOrderId: params.razorpayOrderId,
        razorpaySubscriptionId: params.razorpaySubscriptionId,
        usagePeriodStart: now,
        usagePeriodEnd: periodEnd,
      },
    },
    { new: true, upsert: true },
  );

  const payment = await Payment.findOneAndUpdate(
    { razorpayOrderId: params.razorpayOrderId ?? `manual_${randomUUID()}` },
    {
      $set: {
        workspace: params.workspaceId,
        user: params.userId,
        subscription: subscription._id,
        plan: params.plan,
        billingCycle: params.billingCycle,
        amount: params.amount,
        currency: params.currency,
        status: 'captured',
        razorpayOrderId: params.razorpayOrderId,
        razorpayPaymentId: params.razorpayPaymentId,
        razorpayInvoiceId: params.razorpayInvoiceId,
        invoiceNumber: `INV-${now.getFullYear()}-${String(Date.now()).slice(-8)}`,
        paidAt: now,
      },
      $setOnInsert: { raw: {} },
    },
    { new: true, upsert: true },
  );

  await notifySubscriptionChange(params.workspaceId, params.plan, 'active');

  emitToWorkspace(params.workspaceId, 'subscription:updated', {
    plan: subscription.plan,
    status: subscription.status,
    billingCycle: subscription.billingCycle,
    currentPeriodEnd: subscription.currentPeriodEnd,
  });

  logger.info(
    { workspaceId: params.workspaceId, plan: params.plan, amount: params.amount },
    'subscription activated',
  );

  return subscription;
};

export const cancelSubscription = async (workspaceId: string): Promise<ISubscription> => {
  const subscription = await Subscription.findOneAndUpdate(
    { workspace: workspaceId },
    { $set: { cancelAtPeriodEnd: true, cancelledAt: new Date() } },
    { new: true },
  );
  if (!subscription) throw new NotFoundError('Subscription not found');
  return subscription;
};

export const expireSubscription = async (workspaceId: string): Promise<void> => {
  await Subscription.updateOne(
    { workspace: workspaceId },
    { $set: { status: 'expired', endedAt: new Date() } },
  );
};

export const downgradeSubscription = async (params: {
  workspaceId: string;
  userId: string;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
}): Promise<ISubscription> => {
  const subscription = await getSubscription(params.workspaceId);
  const plan = getPlan(params.plan);

  const currentRank = ['free', 'starter', 'growth', 'business'].indexOf(subscription.plan);
  const targetRank = ['free', 'starter', 'growth', 'business'].indexOf(params.plan);
  if (targetRank >= currentRank) {
    throw new BadRequestError('Use the checkout flow to upgrade your plan');
  }

  // Guard against downgrading below the tenant's actual usage.
  const { InstagramAccount } = await import('../models/InstagramAccount');
  const { Automation } = await import('../models/Automation');
  const [accounts, automations] = await Promise.all([
    InstagramAccount.countDocuments({ workspace: params.workspaceId }),
    Automation.countDocuments({ workspace: params.workspaceId, isActive: true }),
  ]);

  if (accounts > plan.instagramAccounts) {
    throw new SubscriptionError(
      `You have ${accounts} Instagram accounts connected but the ${plan.name} plan allows ${plan.instagramAccounts}. Disconnect some accounts first.`,
    );
  }
  if (automations > plan.activeAutomations) {
    throw new SubscriptionError(
      `You have ${automations} active automations but the ${plan.name} plan allows ${plan.activeAutomations}. Pause some automations first.`,
    );
  }

  const now = new Date();
  const periodEnd = new Date(now);
  if (params.billingCycle === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

  const updated = await Subscription.findOneAndUpdate(
    { workspace: params.workspaceId },
    {
      $set: {
        plan: params.plan,
        billingCycle: params.billingCycle,
        price: plan.priceMonthly,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        planSnapshot: {
          instagramAccounts: plan.instagramAccounts,
          activeAutomations: plan.activeAutomations,
          automationEventsPerMonth: plan.automationEventsPerMonth,
          features: plan.features,
        },
      },
    },
    { new: true },
  );

  await notifySubscriptionChange(params.workspaceId, params.plan, 'active');
  return updated!;
};

const notifySubscriptionChange = async (
  workspaceId: string,
  plan: SubscriptionPlan,
  status: string,
): Promise<void> => {
  const user = await User.findOne({ workspace: workspaceId }).select('name email');
  if (user) {
    await sendSubscriptionEmail(user.email, user.name, getPlan(plan).name, status);
  }
  await createNotification({
    workspaceId,
    type: 'subscription',
    title: `Subscription ${status}`,
    message: `Your plan is now ${getPlan(plan).name} (${status}).`,
    severity: 'success',
    link: '/dashboard/subscription',
  });
};

/**
 * Handles Razorpay webhook events. The signature is always validated first.
 */
export const handleRazorpayWebhook = async (
  rawBody: string,
  signature: string | undefined,
  event: { event: string; payload: Record<string, unknown> },
): Promise<{ received: boolean; handled: boolean }> => {
  if (signature && !verifyRazorpaySignature(rawBody, signature)) {
    logger.warn('razorpay webhook signature mismatch');
    throw new BadRequestError('Invalid webhook signature');
  }

  const eventName = event.event;
  logger.info({ event: eventName }, 'razorpay webhook received');

  const entity = (event.payload?.entity as Record<string, unknown>) ?? {};
  const notes = (entity.notes as Record<string, string>) ?? {};
  const workspaceId = notes.workspaceId;

  switch (eventName) {
    case 'subscription.activated':
    case 'subscription.charged':
    case 'subscription.updated': {
      if (!workspaceId) break;
      const plan = notes.plan as SubscriptionPlan;
      if (!plan) break;
      await Subscription.updateOne(
        { workspace: workspaceId },
        {
          $set: {
            status: eventName === 'subscription.updated' ? 'active' : 'active',
            razorpaySubscriptionId: (entity.id as string) ?? undefined,
          },
        },
      );
      break;
    }
    case 'subscription.cancelled':
    case 'subscription.halted':
    case 'subscription.completed': {
      if (!workspaceId) break;
      await Subscription.updateOne(
        { workspace: workspaceId },
        { $set: { status: 'cancelled', cancelAtPeriodEnd: true, endedAt: new Date() } },
      );
      await notifySubscriptionChange(workspaceId, 'free', 'cancelled');
      break;
    }
    case 'payment.captured': {
      const payment = entity.payload as Record<string, unknown> | undefined;
      const paymentEntity = (payment?.entity ?? payment) as Record<string, unknown>;
      if (!paymentEntity) break;
      await Payment.updateOne(
        { razorpayPaymentId: paymentEntity.id },
        { $set: { status: 'captured', paidAt: new Date() } },
      );
      break;
    }
    case 'payment.failed': {
      const paymentEntity = ((entity.payload as Record<string, unknown>)?.entity ??
        entity) as Record<string, unknown>;
      await Payment.updateOne(
        { razorpayPaymentId: paymentEntity.id },
        { $set: { status: 'failed', failureReason: paymentEntity.error_description as string } },
      );
      break;
    }
    case 'refund.processed': {
      const refund = entity.payload as Record<string, unknown> | undefined;
      const refundEntity = (refund?.entity ?? entity) as Record<string, unknown>;
      await Payment.updateOne(
        { razorpayPaymentId: refundEntity.payment_id },
        { $set: { status: 'refunded', refundedAt: new Date() } },
      );
      break;
    }
    default:
      break;
  }

  return { received: true, handled: Boolean(workspaceId) };
};

// --- local crypto helpers (kept private to this module) --------------------
import crypto from 'crypto';

const cryptoHmac = (secret: string, value: string): string =>
  crypto.createHmac('sha256', secret).update(value).digest('hex');

const safeCompare = (a: string, b: string): boolean => {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

export const listBillingHistory = async (workspaceId: string) => {
  const payments = await Payment.find({ workspace: workspaceId }).sort({ createdAt: -1 }).limit(100).lean();
  return payments.map((p) => ({
    id: p._id.toString(),
    plan: p.plan,
    billingCycle: p.billingCycle,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    invoiceNumber: p.invoiceNumber,
    razorpayPaymentId: p.razorpayPaymentId,
    razorpayInvoiceId: p.razorpayInvoiceId,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
  }));
};

export const workspaceOwner = async (workspaceId: string) =>
  Workspace.findById(workspaceId).select('name owner').lean();
