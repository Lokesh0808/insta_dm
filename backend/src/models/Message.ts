import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { MESSAGE_DIRECTION, MESSAGE_STATUS, type MessageDirection, type MessageStatus } from '../types/enums';

export interface IMessage extends Document {
  createdAt: Date;
  updatedAt: Date;
  workspace: mongoose.Types.ObjectId;
  conversation: mongoose.Types.ObjectId;
  instagramAccount: mongoose.Types.ObjectId;
  direction: MessageDirection;
  body: string;
  status: MessageStatus;
  /** Meta message id (mid) — used for idempotency on inbound events. */
  externalId?: string;
  automation?: mongoose.Types.ObjectId;
  attachment?: { type: string; url: string };
  buttons?: Array<{ type: 'web_url' | 'quick_reply'; title: string; payload?: string; url?: string }>;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  error?: string;
  meta: Record<string, unknown>;
}

const messageSchema = new Schema<IMessage>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    instagramAccount: {
      type: Schema.Types.ObjectId,
      ref: 'InstagramAccount',
      required: true,
      index: true,
    },
    direction: { type: String, enum: MESSAGE_DIRECTION, required: true, index: true },
    body: { type: String, required: true, maxlength: 4000 },
    status: { type: String, enum: MESSAGE_STATUS, default: 'sent', index: true },
    externalId: { type: String },
    automation: { type: Schema.Types.ObjectId, ref: 'Automation' },
    attachment: {
      type: { type: String },
      url: { type: String },
    },
    buttons: {
      type: [
        new Schema(
          {
            type: { type: String, enum: ['web_url', 'quick_reply'] },
            title: { type: String },
            payload: { type: String },
            url: { type: String },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    sentAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date },
    readAt: { type: Date },
    error: { type: String },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

messageSchema.index({ workspace: 1, externalId: 1 }, { unique: true, sparse: true });
messageSchema.index({ conversation: 1, sentAt: 1 });
messageSchema.index({ workspace: 1, createdAt: -1 });

export const Message: Model<IMessage> =
  (mongoose.models.Message as Model<IMessage>) ||
  mongoose.model<IMessage>('Message', messageSchema);
