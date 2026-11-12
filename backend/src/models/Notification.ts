import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { NOTIFICATION_TYPE, type NotificationType } from '../types/enums';

export interface INotification extends Document {
  createdAt: Date;
  updatedAt: Date;
  workspace: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  readAt?: Date;
  meta: Record<string, unknown>;
}

const notificationSchema = new Schema<INotification>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    type: { type: String, enum: NOTIFICATION_TYPE, default: 'system', index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
    link: { type: String },
    readAt: { type: Date },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

notificationSchema.index({ workspace: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  (mongoose.models.Notification as Model<INotification>) ||
  mongoose.model<INotification>('Notification', notificationSchema);
