import mongoose, { Schema, type Document, type Model } from 'mongoose';

/**
 * OAuth token storage. The token payload is AES-256-GCM encrypted at rest and is
 * NEVER returned by any API response. Only metadata (expiry, scopes) is exposed.
 */
export interface IInstagramToken extends Document {
  createdAt: Date;
  updatedAt: Date;
  instagramAccount: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  /** Encrypted: `v1:<iv>:<tag>:<cipher>` */
  accessTokenEncrypted: string;
  /** Encrypted long-lived token (system user / page token) when available. */
  longLivedTokenEncrypted?: string;
  tokenType: 'user' | 'page' | 'system_user';
  expiresAt?: Date;
  scopes: string[];
  isValid: boolean;
  lastRefreshedAt?: Date;
  lastError?: string;
  meta: {
    graphVersion?: string;
    appId?: string;
    userId?: string;
    pageId?: string;
    businessId?: string;
    systemUserId?: string;
    igUserId?: string;
    issuedAt?: Date;
  };
}

const instagramTokenSchema = new Schema<IInstagramToken>(
  {
    instagramAccount: {
      type: Schema.Types.ObjectId,
      ref: 'InstagramAccount',
      required: true,
    },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    accessTokenEncrypted: { type: String, required: true, select: false },
    longLivedTokenEncrypted: { type: String, select: false },
    tokenType: { type: String, enum: ['user', 'page', 'system_user'], default: 'user' },
    expiresAt: { type: Date },
    scopes: { type: [String], default: [] },
    isValid: { type: Boolean, default: true },
    lastRefreshedAt: { type: Date },
    lastError: { type: String },
    meta: {
      graphVersion: String,
      appId: String,
      userId: String,
      pageId: String,
      businessId: String,
      systemUserId: String,
      igUserId: String,
      issuedAt: Date,
    },
  },
  { timestamps: true },
);

instagramTokenSchema.index({ instagramAccount: 1 }, { unique: true });
instagramTokenSchema.index({ workspace: 1, expiresAt: 1 });

instagramTokenSchema.methods.toJSON = function toJSON(this: IInstagramToken) {
  const obj = this.toObject();
  delete obj.accessTokenEncrypted;
  delete obj.longLivedTokenEncrypted;
  return obj;
};

export const InstagramToken: Model<IInstagramToken> =
  (mongoose.models.InstagramToken as Model<IInstagramToken>) ||
  mongoose.model<IInstagramToken>('InstagramToken', instagramTokenSchema);
