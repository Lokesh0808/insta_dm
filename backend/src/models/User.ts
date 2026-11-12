import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { PLATFORM_ROLES, USER_ROLES, type PlatformRole, type UserRole } from '../types/enums';

export interface IUser extends Document {
  createdAt: Date;
  updatedAt: Date;
  name: string;
  email: string;
  passwordHash?: string;
  avatarUrl?: string;
  phone?: string;
  platformRole: PlatformRole;
  workspace: mongoose.Types.ObjectId;
  isEmailVerified: boolean;
  emailVerifiedAt?: Date;
  googleId?: string;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  isSuspended: boolean;
  suspendedReason?: string;
  suspendedAt?: Date;
  lastActiveAt?: Date;
  totpSecret?: string;
  totpEnabled: boolean;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    timezone: string;
    notifications: {
      email: boolean;
      inApp: boolean;
      leadAlerts: boolean;
      usageAlerts: boolean;
    };
  };
  onboardingCompleted: boolean;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, select: false },
    avatarUrl: { type: String },
    phone: { type: String, trim: true },
    platformRole: {
      type: String,
      enum: PLATFORM_ROLES,
      default: 'user',
      index: true,
    },
    workspace: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    isEmailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date },
    googleId: { type: String, sparse: true, index: true },
    lastLoginAt: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    isSuspended: { type: Boolean, default: false, index: true },
    suspendedReason: { type: String },
    suspendedAt: { type: Date },
    lastActiveAt: { type: Date },
    totpSecret: { type: String, select: false },
    totpEnabled: { type: Boolean, default: false },
    preferences: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      timezone: { type: String, default: 'UTC' },
      notifications: {
        email: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        leadAlerts: { type: Boolean, default: true },
        usageAlerts: { type: Boolean, default: true },
      },
    },
    onboardingCompleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

userSchema.index({ platformRole: 1, createdAt: -1 });
userSchema.index({ workspace: 1, createdAt: -1 });
userSchema.index({ lastActiveAt: -1 });

userSchema.methods.toJSON = function toJSON(this: IUser) {
  const obj = this.toObject({ virtuals: true });
  delete obj.passwordHash;
  delete obj.totpSecret;
  delete obj.failedLoginAttempts;
  delete obj.lockedUntil;
  return obj;
};

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', userSchema);

export const WORKSPACE_MEMBER_ROLES: UserRole[] = [...USER_ROLES];
