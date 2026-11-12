import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { BILLING_CYCLE, PAYMENT_STATUS, type BillingCycle, type PaymentStatus } from '../types/enums';

export interface IPayment extends Document {
  createdAt: Date;
  updatedAt: Date;
  workspace: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  subscription: mongoose.Types.ObjectId;
  plan: string;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  status: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  razorpayInvoiceId?: string;
  invoiceNumber: string;
  /** URL to the generated PDF invoice (S3 or local). */
  invoiceUrl?: string;
  paidAt?: Date;
  refundedAt?: Date;
  failureReason?: string;
  raw: Record<string, unknown>;
}

const paymentSchema = new Schema<IPayment>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subscription: { type: Schema.Types.ObjectId, ref: 'Subscription', index: true },
    plan: { type: String, required: true },
    billingCycle: { type: String, enum: BILLING_CYCLE, default: 'monthly' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: PAYMENT_STATUS, default: 'created', index: true },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String, index: true },
    razorpaySignature: { type: String, select: false },
    razorpayInvoiceId: { type: String },
    invoiceNumber: { type: String, required: true, unique: true },
    invoiceUrl: { type: String },
    paidAt: { type: Date },
    refundedAt: { type: Date },
    failureReason: { type: String },
    raw: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

paymentSchema.index({ workspace: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ razorpayOrderId: 1 }, { unique: true, sparse: true });

paymentSchema.methods.toJSON = function toJSON(this: IPayment) {
  const obj = this.toObject();
  delete obj.razorpaySignature;
  return obj;
};

export const Payment: Model<IPayment> =
  (mongoose.models.Payment as Model<IPayment>) || mongoose.model<IPayment>('Payment', paymentSchema);
