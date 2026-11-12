import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { TRIGGER_TYPES, type TriggerType } from '../types/enums';

/**
 * Standalone trigger rules. Keyword rules live here so they can be re-used across
 * automations, while inline triggers are kept on the Automation document.
 */
export interface IAutomationTrigger extends Document {
  createdAt: Date;
  updatedAt: Date;
  workspace: mongoose.Types.ObjectId;
  automation: mongoose.Types.ObjectId;
  instagramAccount: mongoose.Types.ObjectId;
  name: string;
  type: TriggerType;
  isActive: boolean;
  priority: number;
  keywords: string[];
  matchType: 'EXACT' | 'PARTIAL' | 'STARTS_WITH' | 'CONTAINS' | 'REGEX';
  caseSensitive: boolean;
  mediaIds: string[];
  storyIds: string[];
  delaySeconds: number;
  /** Value substituted into the reply template, e.g. {{username}}. */
  templateVariables: string[];
  config: Record<string, unknown>;
}

const automationTriggerSchema = new Schema<IAutomationTrigger>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    automation: { type: Schema.Types.ObjectId, ref: 'Automation', required: true },
    instagramAccount: {
      type: Schema.Types.ObjectId,
      ref: 'InstagramAccount',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: TRIGGER_TYPES, required: true, index: true },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
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
    templateVariables: { type: [String], default: [] },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

automationTriggerSchema.index({ workspace: 1, type: 1, isActive: 1, priority: -1 });
automationTriggerSchema.index({ automation: 1 });

export const AutomationTrigger: Model<IAutomationTrigger> =
  (mongoose.models.AutomationTrigger as Model<IAutomationTrigger>) ||
  mongoose.model<IAutomationTrigger>('AutomationTrigger', automationTriggerSchema);
