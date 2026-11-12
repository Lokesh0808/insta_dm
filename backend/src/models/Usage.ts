import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { USAGE_METRICS, type UsageMetric } from '../types/enums';

/**
 * Per-workspace, per-metric, per-period usage counters used for plan limits.
 */
export interface IUsage extends Document {
  workspace: mongoose.Types.ObjectId;
  metric: UsageMetric;
  /** ISO period key, e.g. `2026-03` for monthly or `2026-03-12` for daily. */
  period: string;
  periodType: 'day' | 'month';
  count: number;
  limit: number;
  createdAt: Date;
  updatedAt: Date;
}

const usageSchema = new Schema<IUsage>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    metric: { type: String, enum: USAGE_METRICS, required: true },
    period: { type: String, required: true },
    periodType: { type: String, enum: ['day', 'month'], default: 'month' },
    count: { type: Number, default: 0 },
    limit: { type: Number, default: 0 },
  },
  { timestamps: true },
);

usageSchema.index({ workspace: 1, metric: 1, period: 1 }, { unique: true });
usageSchema.index({ metric: 1, period: 1 });

export const Usage: Model<IUsage> =
  (mongoose.models.Usage as Model<IUsage>) || mongoose.model<IUsage>('Usage', usageSchema);
