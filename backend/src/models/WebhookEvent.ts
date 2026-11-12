import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { WEBHOOK_STATUS, type WebhookStatus } from '../types/enums';

/**
 * Raw Meta webhook payloads for auditing, replay and idempotency.
 */
export interface IWebhookEvent extends Document {
  createdAt: Date;
  updatedAt: Date;
  workspace?: mongoose.Types.ObjectId;
  source: 'instagram' | 'razorpay' | 'unknown';
  eventType: string;
  externalId?: string;
  status: WebhookStatus;
  payload: Record<string, unknown>;
  processedAt?: Date;
  error?: string;
  attempts: number;
}

const webhookEventSchema = new Schema<IWebhookEvent>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', index: true },
    source: { type: String, enum: ['instagram', 'razorpay', 'unknown'], default: 'unknown', index: true },
    eventType: { type: String, required: true, index: true },
    externalId: { type: String, index: true },
    status: { type: String, enum: WEBHOOK_STATUS, default: 'received', index: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    processedAt: { type: Date },
    error: { type: String },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true },
);

webhookEventSchema.index({ source: 1, externalId: 1 }, { unique: true, sparse: true });
webhookEventSchema.index({ createdAt: -1 });
webhookEventSchema.index({ workspace: 1, createdAt: -1 });

export const WebhookEvent: Model<IWebhookEvent> =
  (mongoose.models.WebhookEvent as Model<IWebhookEvent>) ||
  mongoose.model<IWebhookEvent>('WebhookEvent', webhookEventSchema);
