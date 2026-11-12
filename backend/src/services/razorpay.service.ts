import Razorpay from 'razorpay';
import { env, razorpayConfig } from '../config/env';
import { logger } from '../config/logger';
import { IntegrationError } from '../utils/errors';

let client: Razorpay | null = null;

export const getRazorpay = (): Razorpay => {
  if (client) return client;
  if (!razorpayConfig.configured) {
    throw new IntegrationError('Razorpay is not configured', 503);
  }
  client = new Razorpay({
    key_id: razorpayConfig.keyId,
    key_secret: razorpayConfig.keySecret,
  });
  return client;
};

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
}

export const createRazorpayOrder = async (params: {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> => {
  const razorpay = getRazorpay();
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(params.amount * 100), // Razorpay expects paise
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes ?? {},
    });
    return order as unknown as RazorpayOrder;
  } catch (error) {
    logger.error({ err: (error as Error).message }, 'razorpay order creation failed');
    throw new IntegrationError('Could not create the payment order');
  }
};

export const fetchRazorpayPayment = async (paymentId: string): Promise<Record<string, unknown>> => {
  const razorpay = getRazorpay();
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment as unknown as Record<string, unknown>;
  } catch (error) {
    logger.error({ err: (error as Error).message, paymentId }, 'razorpay payment fetch failed');
    throw new IntegrationError('Could not verify the payment with Razorpay');
  }
};

export const fetchRazorpaySubscription = async (subscriptionId: string) => {
  const razorpay = getRazorpay();
  try {
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);
    return subscription as unknown as Record<string, unknown>;
  } catch (error) {
    logger.error({ err: (error as Error).message }, 'razorpay subscription fetch failed');
    throw new IntegrationError('Could not fetch the subscription from Razorpay');
  }
};

export const createRazorpaySubscription = async (params: {
  planId: string;
  totalCount?: number;
  customerNotify?: boolean;
  notes?: Record<string, string>;
}) => {
  const razorpay = getRazorpay();
  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: params.planId,
      total_count: params.totalCount ?? 12,
      customer_notify: params.customerNotify ?? 1,
      notes: params.notes ?? {},
    });
    return subscription as unknown as Record<string, unknown>;
  } catch (error) {
    logger.error({ err: (error as Error).message }, 'razorpay subscription creation failed');
    throw new IntegrationError('Could not create the subscription');
  }
};

/**
 * Verifies the `X-Razorpay-Signature` header using HMAC-SHA256 over the raw body.
 */
export const verifyRazorpaySignature = (rawBody: string, signature: string): boolean => {
  if (!razorpayConfig.webhookSecret) {
    logger.warn('RAZORPAY_WEBHOOK_SECRET is not configured — signature check skipped');
    return false;
  }
  const expected = crypto_hmac(razorpayConfig.webhookSecret, rawBody);
  return safeEquals(expected, signature);
};

import crypto from 'crypto';

const crypto_hmac = (secret: string, body: string): string =>
  crypto.createHmac('sha256', secret).update(body).digest('hex');

const safeEquals = (a: string, b: string): boolean => {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

export const isRazorpayConfigured = razorpayConfig.configured;
export const razorpayKeyId = env.RAZORPAY_KEY_ID;
