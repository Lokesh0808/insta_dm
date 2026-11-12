import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IAuditLog extends Document {
  createdAt: Date;
  updatedAt: Date;
  workspace?: mongoose.Types.ObjectId;
  actor?: mongoose.Types.ObjectId;
  actorEmail?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  meta: Record<string, unknown>;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', index: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorEmail: { type: String },
    action: { type: String, required: true, index: true },
    resource: { type: String, index: true },
    resourceId: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    status: { type: String, enum: ['success', 'failure'], default: 'success' },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ workspace: 1, action: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  (mongoose.models.AuditLog as Model<IAuditLog>) ||
  mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
