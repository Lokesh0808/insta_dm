import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface ISession extends Document {
  createdAt: Date;
  updatedAt: Date;
  user: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  refreshTokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  revokedAt?: Date;
  lastUsedAt?: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    refreshTokenHash: { type: String, required: true, select: false },
    userAgent: { type: String },
    ipAddress: { type: String },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    lastUsedAt: { type: Date },
  },
  { timestamps: true },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ user: 1, revokedAt: 1 });

sessionSchema.methods.toJSON = function toJSON(this: ISession) {
  const obj = this.toObject();
  delete obj.refreshTokenHash;
  return obj;
};

export const Session: Model<ISession> =
  (mongoose.models.Session as Model<ISession>) ||
  mongoose.model<ISession>('Session', sessionSchema);

/**
 * Short-lived tokens for email verification / password reset.
 * Only the SHA-256 hash is persisted.
 */
export interface IAuthToken extends Document {
  createdAt: Date;
  updatedAt: Date;
  user: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  purpose: 'email_verification' | 'password_reset';
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
}

const authTokenSchema = new Schema<IAuthToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    purpose: {
      type: String,
      enum: ['email_verification', 'password_reset'],
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: true },
);

authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authTokenSchema.index({ user: 1, purpose: 1 });

export const AuthToken: Model<IAuthToken> =
  (mongoose.models.AuthToken as Model<IAuthToken>) ||
  mongoose.model<IAuthToken>('AuthToken', authTokenSchema);
