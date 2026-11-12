import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { USER_ROLES, type UserRole } from '../types/enums';

export interface IWorkspaceMember {
  user: mongoose.Types.ObjectId;
  role: UserRole;
  joinedAt: Date;
}

export interface IWorkspace extends Document {
  createdAt: Date;
  updatedAt: Date;
  name: string;
  slug: string;
  owner: mongoose.Types.ObjectId;
  members: IWorkspaceMember[];
  settings: {
    defaultTimezone: string;
    fallbackMessage?: string;
    leadNotifications: boolean;
    brandColor: string;
  };
  instagramAccounts: number;
  isActive: boolean;
}

const memberSchema = new Schema<IWorkspaceMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: USER_ROLES, default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const workspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    members: { type: [memberSchema], default: [] },
    settings: {
      defaultTimezone: { type: String, default: 'UTC' },
      fallbackMessage: { type: String, default: 'Thanks for reaching out! We will get back to you soon.' },
      leadNotifications: { type: Boolean, default: true },
      brandColor: { type: String, default: '#6366f1' },
    },
    instagramAccounts: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

workspaceSchema.index({ 'members.user': 1 });

export const Workspace: Model<IWorkspace> =
  (mongoose.models.Workspace as Model<IWorkspace>) ||
  mongoose.model<IWorkspace>('Workspace', workspaceSchema);
