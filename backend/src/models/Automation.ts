import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { AUTOMATION_TYPES, type AutomationType } from '../types/enums';

export interface IAutomationTrigger {
  type: string;
  enabled: boolean;
  /** Keyword trigger */
  keywords?: string[];
  matchType?: 'EXACT' | 'PARTIAL' | 'STARTS_WITH' | 'CONTAINS' | 'REGEX';
  caseSensitive?: boolean;
  /** Comment trigger */
  mediaIds?: string[];
  /** Delay in seconds applied before the first message is sent. */
  delaySeconds?: number;
  /** Story reply trigger */
  storyIds?: string[];
  config?: Record<string, unknown>;
}

export interface IAutomation extends Document {
  createdAt: Date;
  updatedAt: Date;
  workspace: mongoose.Types.ObjectId;
  instagramAccount: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  type: AutomationType;
  isActive: boolean;
  priority: number;
  triggers: IAutomationTrigger[];
  /** Fallback reply used when no rule matches. */
  fallbackMessage?: string;
  /** Simple template replies for keyword rules. */
  message?: string;
  /** Advanced workflow definition (nodes + edges) for WORKFLOW automations. */
  workflow?: {
    nodes: Array<Record<string, unknown>>;
    edges: Array<Record<string, unknown>>;
  };
  buttons?: Array<{ type: 'web_url' | 'quick_reply'; title: string; payload?: string; url?: string }>;
  collectLead: boolean;
  leadTags?: string[];
  /** Instagram messaging window (24h) tracking to respect platform policy. */
  messagingWindowExpiresAt?: Date;
  stats: {
    triggered: number;
    succeeded: number;
    failed: number;
    leads: number;
    lastTriggeredAt?: Date;
  };
  lastError?: string;
}

const triggerSchema = new Schema<IAutomationTrigger>(
  {
    type: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    keywords: { type: [String], default: [] },
    matchType: {
      type: String,
      enum: ['EXACT', 'PARTIAL', 'STARTS_WITH', 'CONTAINS', 'REGEX'],
      default: 'PARTIAL',
    },
    caseSensitive: { type: Boolean, default: false },
    mediaIds: { type: [String], default: [] },
    storyIds: { type: [String], default: [] },
    delaySeconds: { type: Number, default: 0, min: 0, max: 86400 },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: true },
);

const buttonSchema = new Schema(
  {
    type: { type: String, enum: ['web_url', 'quick_reply'], required: true },
    title: { type: String, required: true },
    payload: { type: String },
    url: { type: String },
  },
  { _id: false },
);

const automationSchema = new Schema<IAutomation>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    instagramAccount: {
      type: Schema.Types.ObjectId,
      ref: 'InstagramAccount',
      required: true,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 1000 },
    type: { type: String, enum: AUTOMATION_TYPES, required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 0, index: true },
    triggers: { type: [triggerSchema], default: [] },
    fallbackMessage: { type: String, maxlength: 2000 },
    message: { type: String, maxlength: 2000 },
    workflow: {
      nodes: { type: [Schema.Types.Mixed], default: [] },
      edges: { type: [Schema.Types.Mixed], default: [] },
    },
    buttons: { type: [buttonSchema], default: [] },
    collectLead: { type: Boolean, default: false },
    leadTags: { type: [String], default: [] },
    messagingWindowExpiresAt: { type: Date },
    stats: {
      triggered: { type: Number, default: 0 },
      succeeded: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      leads: { type: Number, default: 0 },
      lastTriggeredAt: { type: Date },
    },
    lastError: { type: String },
  },
  { timestamps: true },
);

automationSchema.index({ workspace: 1, isActive: 1, priority: -1 });
automationSchema.index({ workspace: 1, type: 1 });
automationSchema.index({ instagramAccount: 1, type: 1, isActive: 1 });

export const Automation: Model<IAutomation> =
  (mongoose.models.Automation as Model<IAutomation>) ||
  mongoose.model<IAutomation>('Automation', automationSchema);
