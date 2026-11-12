import mongoose, { Schema, type Document, type Model } from 'mongoose';
import {
  INSTAGRAM_ACCOUNT_TYPES,
  INSTAGRAM_CONNECTION_STATUS,
  type InstagramAccountType,
  type InstagramConnectionStatus,
} from '../types/enums';

export interface IInstagramAccount extends Document {
  createdAt: Date;
  updatedAt: Date;
  workspace: mongoose.Types.ObjectId;
  connectedBy: mongoose.Types.ObjectId;
  igUserId: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
  accountType: InstagramAccountType;
  /** Facebook Page / Instagram Professional account linked to the IG user. */
  pageId?: string;
  pageName?: string;
  biography?: string;
  website?: string;
  connectionStatus: InstagramConnectionStatus;
  connectedAt: Date;
  lastSyncedAt?: Date;
  lastError?: string;
  /** Metadata used by comment-to-DM automations. */
  trackedMediaIds: string[];
  settings: {
    defaultResponseDelaySeconds: number;
    pauseAutomations: boolean;
    respectMessagingWindow: boolean;
  };
}

const instagramAccountSchema = new Schema<IInstagramAccount>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    connectedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    igUserId: { type: String, required: true },
    username: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String },
    profilePictureUrl: { type: String },
    followersCount: { type: Number, default: 0 },
    followsCount: { type: Number, default: 0 },
    mediaCount: { type: Number, default: 0 },
    accountType: { type: String, enum: INSTAGRAM_ACCOUNT_TYPES, default: 'BUSINESS' },
    pageId: { type: String },
    pageName: { type: String },
    biography: { type: String },
    website: { type: String },
    connectionStatus: {
      type: String,
      enum: INSTAGRAM_CONNECTION_STATUS,
      default: 'connected',
      index: true,
    },
    connectedAt: { type: Date, default: Date.now },
    lastSyncedAt: { type: Date },
    lastError: { type: String },
    trackedMediaIds: { type: [String], default: [] },
    settings: {
      defaultResponseDelaySeconds: { type: Number, default: 2, min: 0, max: 300 },
      pauseAutomations: { type: Boolean, default: false },
      respectMessagingWindow: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

// A workspace may only connect a given Instagram account once.
instagramAccountSchema.index({ workspace: 1, igUserId: 1 }, { unique: true });
instagramAccountSchema.index({ workspace: 1, username: 1 });
instagramAccountSchema.index({ workspace: 1, createdAt: -1 });

instagramAccountSchema.methods.toJSON = function toJSON(this: IInstagramAccount) {
  const obj = this.toObject({ virtuals: true });
  return obj;
};

export const InstagramAccount: Model<IInstagramAccount> =
  (mongoose.models.InstagramAccount as Model<IInstagramAccount>) ||
  mongoose.model<IInstagramAccount>('InstagramAccount', instagramAccountSchema);
