import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { LEAD_SOURCE, LEAD_STATUS, type LeadSource, type LeadStatus } from '../types/enums';

export interface ILead extends Document {
  createdAt: Date;
  updatedAt: Date;
  workspace: mongoose.Types.ObjectId;
  instagramAccount: mongoose.Types.ObjectId;
  automation?: mongoose.Types.ObjectId;
  conversation?: mongoose.Types.ObjectId;
  execution?: mongoose.Types.ObjectId;
  /** Instagram username of the lead. */
  igUsername: string;
  igUserId?: string;
  name?: string;
  email?: string;
  phone?: string;
  source: LeadSource;
  sourceAutomationId?: mongoose.Types.ObjectId;
  status: LeadStatus;
  tags: string[];
  notes?: string;
  customFields: Record<string, unknown>;
  /** Snapshot of the Instagram profile at capture time. */
  profileSnapshot?: {
    followersCount?: number;
    biography?: string;
    profilePictureUrl?: string;
  };
  metadata: Record<string, unknown>;
}

const leadSchema = new Schema<ILead>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    instagramAccount: {
      type: Schema.Types.ObjectId,
      ref: 'InstagramAccount',
      required: true,
      index: true,
    },
    automation: { type: Schema.Types.ObjectId, ref: 'Automation', index: true },
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    execution: { type: Schema.Types.ObjectId, ref: 'AutomationExecution' },
    igUsername: { type: String, required: true, trim: true, lowercase: true, index: true },
    igUserId: { type: String },
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    phone: { type: String, trim: true },
    source: { type: String, enum: LEAD_SOURCE, required: true, index: true },
    sourceAutomationId: { type: Schema.Types.ObjectId, ref: 'Automation' },
    status: { type: String, enum: LEAD_STATUS, default: 'new', index: true },
    tags: { type: [String], default: [], index: true },
    notes: { type: String, maxlength: 5000 },
    customFields: { type: Schema.Types.Mixed, default: {} },
    profileSnapshot: {
      followersCount: { type: Number },
      biography: { type: String },
      profilePictureUrl: { type: String },
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

leadSchema.index({ workspace: 1, createdAt: -1 });
leadSchema.index({ workspace: 1, status: 1, createdAt: -1 });
leadSchema.index({ workspace: 1, igUsername: 1 });
// A lead is unique per workspace + Instagram user.
leadSchema.index({ workspace: 1, igUserId: 1 }, { unique: true, sparse: true });

leadSchema.methods.toJSON = function toJSON(this: ILead) {
  return this.toObject({ virtuals: true });
};

export const Lead: Model<ILead> =
  (mongoose.models.Lead as Model<ILead>) || mongoose.model<ILead>('Lead', leadSchema);
