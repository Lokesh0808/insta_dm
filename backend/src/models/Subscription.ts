import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  BILLING_CYCLE,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUS,
  type BillingCycle,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from '../types/enums';

export interface IPlanSnapshot {
  instagramAccounts: number;
  activeAutomations: number;
  automationEventsPerMonth: number;
  features: string[];
}

export interface ISubscription extends Document {
  createdAt: Date;
  updatedAt: Date;
  workspace: mongoose.Types.ObjectId;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  planSnapshot: IPlanSnapshot;
  price: number;
  currency: string;
  /** Razorpay identifiers */
  razorpaySubscriptionId?: string;
  razorpayPlanId?: string;
  razorpayOrderId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  endedAt?: Date;
  trialEndsAt?: Date;
  usage: {
    automationEvents: number;
    instagramAccounts: number;
    activeAutomations: number;
    messagesSent: number;
    leadsCreated: number;
    linkClicks: number;
  };
  usagePeriodStart: Date;
  usagePeriodEnd: Date;
  notes?: string;
}

const planSnapshotSchema = new Schema<IPlanSnapshot>(
  {
    instagramAccounts: { type: Number, required: true },
    activeAutomations: { type: Number, required: true },
    automationEventsPerMonth: { type: Number, required: true },
    features: { type: [String], default: [] },
  },
  { _id: false },
);

const usageSchema = new Schema(
  {
    automationEvents: { type: Number, default: 0 },
    instagramAccounts: { type: Number, default: 0 },
    activeAutomations: { type: Number, default: 0 },
    messagesSent: { type: Number, default: 0 },
    leadsCreated: { type: Number, default: 0 },
    linkClicks: { type: Number, default: 0 },
  },
  { _id: false },
);

const subscriptionSchema = new Schema<ISubscription>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    plan: { type: String, enum: SUBSCRIPTION_PLANS, default: 'free', index: true },
    status: { type: String, enum: SUBSCRIPTION_STATUS, default: 'active', index: true },
    billingCycle: { type: String, enum: BILLING_CYCLE, default: 'monthly' },
    planSnapshot: {
      type: planSnapshotSchema,
      required: true,
    },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    razorpaySubscriptionId: { type: String, index: true },
    razorpayPlanId: { type: String },
    razorpayOrderId: { type: String },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date, index: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    cancelledAt: { type: Date },
    endedAt: { type: Date },
    trialEndsAt: { type: Date },
    usage: { type: usageSchema, default: () => ({}) },
    usagePeriodStart: { type: Date, default: Date.now },
    usagePeriodEnd: { type: Date },
    notes: { type: String },
  },
  { timestamps: true },
);

subscriptionSchema.index({ workspace: 1 }, { unique: true });
subscriptionSchema.index({ plan: 1, status: 1 });
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

export const Subscription: Model<ISubscription> =
  (mongoose.models.Subscription as Model<ISubscription>) ||
  mongoose.model<ISubscription>('Subscription', subscriptionSchema);
