import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { EXECUTION_STATUS, type ExecutionStatus } from '../types/enums';

export interface IAutomationExecution extends Document {
  createdAt: Date;
  updatedAt: Date;
  workspace: mongoose.Types.ObjectId;
  automation: mongoose.Types.ObjectId;
  instagramAccount: mongoose.Types.ObjectId;
  triggerType: string;
  triggerKeyword?: string;
  /** Instagram user id (IGSID) of the person who triggered the automation. */
  igUserId: string;
  igUsername?: string;
  sourceId?: string;
  status: ExecutionStatus;
  step: string;
  matchedRule?: string;
  messageSent?: string;
  responseMessageId?: string;
  lead?: mongoose.Types.ObjectId;
  error?: string;
  durationMs?: number;
  meta: Record<string, unknown>;
}

const automationExecutionSchema = new Schema<IAutomationExecution>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    automation: { type: Schema.Types.ObjectId, ref: 'Automation', required: true, index: true },
    instagramAccount: {
      type: Schema.Types.ObjectId,
      ref: 'InstagramAccount',
      required: true,
      index: true,
    },
    triggerType: { type: String, required: true },
    triggerKeyword: { type: String },
    igUserId: { type: String, required: true, index: true },
    igUsername: { type: String },
    /** Unique id of the inbound event, used to guarantee idempotency. */
    sourceId: { type: String },
    status: { type: String, enum: EXECUTION_STATUS, default: 'queued', index: true },
    step: { type: String, default: 'received' },
    matchedRule: { type: String },
    messageSent: { type: String },
    responseMessageId: { type: String },
    lead: { type: Schema.Types.ObjectId, ref: 'Lead' },
    error: { type: String },
    durationMs: { type: Number },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

// Idempotency: the same Meta event must never be processed twice.
automationExecutionSchema.index({ workspace: 1, sourceId: 1 }, { unique: true, sparse: true });
automationExecutionSchema.index({ workspace: 1, status: 1, createdAt: -1 });
automationExecutionSchema.index({ automation: 1, createdAt: -1 });
automationExecutionSchema.index({ igUserId: 1, createdAt: -1 });

export const AutomationExecution: Model<IAutomationExecution> =
  (mongoose.models.AutomationExecution as Model<IAutomationExecution>) ||
  mongoose.model<IAutomationExecution>('AutomationExecution', automationExecutionSchema);
