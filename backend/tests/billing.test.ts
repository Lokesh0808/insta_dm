import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { Payment } from '../src/models/Payment';
import { Subscription } from '../src/models/Subscription';
import { startTestDatabase, stopTestDatabase, clearDatabase } from './helpers';

const app = createApp();

describe('Billing API', () => {
  let accessToken: string;

  beforeAll(async () => {
    await startTestDatabase();
  }, 120000);

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    const registration = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Billing User', email: 'billing@example.com', password: 'StrongPass123' })
      .expect(201);
    accessToken = registration.body.data.accessToken;
  });

  describe('GET /api/billing/plans', () => {
    it('returns all four plans with their entitlements', async () => {
      const res = await request(app).get('/api/billing/plans').expect(200);

      expect(res.body.data.plans).toHaveLength(4);
      const growth = res.body.data.plans.find((p: any) => p.id === 'growth');
      expect(growth.entitlements.workflowBuilder).toBe(true);
      expect(growth.automationEventsPerMonth).toBe(25000);
    });
  });

  describe('GET /api/billing/subscription', () => {
    it('returns the free plan for a new workspace', async () => {
      const res = await request(app)
        .get('/api/billing/subscription')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.subscription.plan).toBe('free');
      expect(res.body.data.usage.metrics.automationEvents.limit).toBe(500);
    });
  });

  describe('POST /api/billing/create-order', () => {
    it('refuses to create an order for the free plan', async () => {
      const res = await request(app)
        .post('/api/billing/create-order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ plan: 'free', billingCycle: 'monthly' })
        .expect(400);

      expect(res.body.error.message).toMatch(/free plan/i);
    });

    it('requires authentication', async () => {
      await request(app)
        .post('/api/billing/create-order')
        .send({ plan: 'growth', billingCycle: 'monthly' })
        .expect(401);
    });

    it('rejects an unknown plan', async () => {
      await request(app)
        .post('/api/billing/create-order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ plan: 'enterprise', billingCycle: 'monthly' })
        .expect(422);
    });
  });

  describe('POST /api/billing/verify-payment', () => {
    it('rejects a payment with an invalid signature', async () => {
      const res = await request(app)
        .post('/api/billing/verify-payment')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          razorpayOrderId: 'order_123456',
          razorpayPaymentId: 'pay_123456',
          razorpaySignature: 'deadbeefdeadbeefdeadbeefdeadbeef',
          plan: 'growth',
          billingCycle: 'monthly',
        })
        .expect(402);

      expect(res.body.error.code).toBe('SUBSCRIPTION_ERROR');
      expect(res.body.error.message).toMatch(/signature/i);
    });
  });

  describe('POST /api/billing/webhook', () => {
    it('rejects a webhook with an invalid signature', async () => {
      const res = await request(app)
        .post('/api/billing/webhook')
        .set('x-razorpay-signature', 'invalid-signature')
        .send({ event: 'payment.captured', payload: {} })
        .expect(400);

      expect(res.body.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('POST /api/billing/activate-manually', () => {
    it('activates a plan in non-production environments', async () => {
      const res = await request(app)
        .post('/api/billing/activate-manually')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ plan: 'starter', billingCycle: 'monthly' })
        .expect(200);

      expect(res.body.data.subscription.plan).toBe('starter');
      expect(res.body.data.subscription.status).toBe('active');

      const subscription = await Subscription.findOne({ plan: 'starter' });
      expect(subscription).not.toBeNull();
      expect(subscription!.planSnapshot.automationEventsPerMonth).toBe(5000);
    });
  });

  describe('GET /api/billing/history', () => {
    it('lists payments for the workspace', async () => {
      const subscription = await Subscription.findOne({});
      await Payment.create({
        workspace: subscription!.workspace,
        user: subscription!.workspace,
        plan: 'starter',
        billingCycle: 'monthly',
        amount: 999,
        currency: 'INR',
        status: 'captured',
        invoiceNumber: 'INV-TEST-001',
        razorpayPaymentId: 'pay_test_001',
        paidAt: new Date(),
      });

      const res = await request(app)
        .get('/api/billing/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.payments).toHaveLength(1);
      expect(res.body.data.payments[0].invoiceNumber).toBe('INV-TEST-001');
    });
  });

  describe('tenant isolation', () => {
    it('does not expose another workspace subscription', async () => {
      const other = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Other User', email: 'other@example.com', password: 'StrongPass123' })
        .expect(201);

      const res = await request(app)
        .get('/api/billing/subscription')
        .set('Authorization', `Bearer ${other.body.data.accessToken}`)
        .expect(200);

      expect(res.body.data.subscription.plan).toBe('free');
      expect(res.body.data.subscription.plan).not.toBe('starter');
    });
  });
});
