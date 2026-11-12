import crypto from 'crypto';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Session, AuthToken } from '../models/Session';
import { createWorkspace } from './workspace.service';
import { hashPassword, verifyPassword, fakePasswordCompare } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sha256, randomToken } from '../utils/crypto';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from './email.service';
import { logger } from '../config/logger';
import { googleConfig } from '../config/env';
import axios from 'axios';

const MAX_FAILED_ATTEMPTS = 8;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export interface AuthResult {
  user: any;
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresIn: string;
}

const issueTokens = async (params: {
  userId: string;
  email: string;
  role: string;
  workspaceId: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<AuthResult> => {
  // The session id doubles as the MongoDB `_id` of the session document.
  const sessionId = new mongoose.Types.ObjectId().toString();
  const refreshToken = signRefreshToken({ userId: params.userId, sessionId });
  const accessToken = signAccessToken({
    userId: params.userId,
    email: params.email,
    role: params.role,
    workspaceId: params.workspaceId,
  });

  await Session.create({
    _id: sessionId,
    user: params.userId,
    workspace: params.workspaceId,
    refreshTokenHash: sha256(refreshToken),
    userAgent: params.userAgent,
    ipAddress: params.ipAddress,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    lastUsedAt: new Date(),
  });

  return {
    user: null,
    accessToken,
    refreshToken,
    sessionId,
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  };
};

export const register = async (params: {
  name: string;
  email: string;
  password: string;
  workspaceName?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<AuthResult> => {
  const existing = await User.findOne({ email: params.email });
  if (existing) throw new ConflictError('An account with this email already exists');

  const passwordHash = await hashPassword(params.password);
  const workspaceName = params.workspaceName?.trim() || `${params.name.split(' ')[0]}'s workspace`;

  // The workspace references the owner and the user references the workspace,
  // so the user id is allocated up front and both documents are wired together.
  const userId = new mongoose.Types.ObjectId();

  const workspace = await createWorkspace({
    name: workspaceName,
    ownerId: userId,
  });

  const user = await User.create({
    _id: userId,
    name: params.name,
    email: params.email,
    passwordHash,
    workspace: workspace._id,
    platformRole: 'user',
  });

  const tokens = await issueTokens({
    userId: user._id.toString(),
    email: user.email,
    role: 'owner',
    workspaceId: workspace._id.toString(),
    userAgent: params.userAgent,
    ipAddress: params.ipAddress,
  });

  // --- Email verification ---------------------------------------------------
  const verificationToken = randomToken(32);
  await AuthToken.create({
    user: user._id,
    workspace: workspace._id,
    purpose: 'email_verification',
    tokenHash: sha256(verificationToken),
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
  });
  await sendVerificationEmail(user.email, user.name, verificationToken);
  await sendWelcomeEmail(user.email, user.name);

  return { ...tokens, user: user.toJSON() };
};

export const login = async (params: {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<AuthResult> => {
  const user = await User.findOne({ email: params.email }).select('+passwordHash');

  if (!user) {
    await fakePasswordCompare(params.password);
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.isSuspended) {
    throw new ForbiddenError('This account has been suspended. Contact support for help.');
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new ForbiddenError('Too many failed login attempts. Try again later.');
  }

  const valid = await verifyPassword(params.password, user.passwordHash ?? '');
  if (!valid) {
    user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    throw new UnauthorizedError('Invalid email or password');
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  user.lastActiveAt = new Date();
  await user.save();

  const tokens = await issueTokens({
    userId: user._id.toString(),
    email: user.email,
    role: 'owner',
    workspaceId: user.workspace.toString(),
    userAgent: params.userAgent,
    ipAddress: params.ipAddress,
  });

  return { ...tokens, user: user.toJSON() };
};

export const refreshSession = async (refreshToken: string): Promise<AuthResult> => {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const session = await Session.findOne({ _id: payload.sessionId }).select('+refreshTokenHash');
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new UnauthorizedError('Session has expired — please sign in again');
  }
  if (session.refreshTokenHash !== sha256(refreshToken)) {
    // Token reuse detected — invalidate every session for the user.
    await Session.updateMany(
      { user: session.user, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
    logger.warn({ userId: session.user.toString() }, 'refresh token reuse detected');
    throw new UnauthorizedError('Session is no longer valid — please sign in again');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new UnauthorizedError('Account no longer exists');
  if (user.isSuspended) throw new ForbiddenError('This account has been suspended');

  // Rotate the refresh token.
  const newRefreshToken = signRefreshToken({ userId: user._id.toString(), sessionId: session._id.toString() });
  session.refreshTokenHash = sha256(newRefreshToken);
  session.lastUsedAt = new Date();
  await session.save();

  const accessToken = signAccessToken({
    userId: user._id.toString(),
    email: user.email,
    role: 'owner',
    workspaceId: user.workspace.toString(),
  });

  return {
    user: user.toJSON(),
    accessToken,
    refreshToken: newRefreshToken,
    sessionId: session._id.toString(),
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  };
};

export const logout = async (sessionId: string, userId?: string): Promise<void> => {
  const filter: Record<string, unknown> = { _id: sessionId, revokedAt: { $exists: false } };
  if (userId) filter.user = userId;
  await Session.updateMany(filter, { $set: { revokedAt: new Date() } });
};

export const logoutAll = async (userId: string): Promise<void> => {
  await Session.updateMany(
    { user: userId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
};

export const listSessions = async (userId: string) => {
  const sessions = await Session.find({
    user: userId,
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  })
    .select('userAgent ipAddress lastUsedAt createdAt expiresAt')
    .lean();
  return sessions.map((s) => ({
    id: s._id.toString(),
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
    lastUsedAt: s.lastUsedAt,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
  }));
};

export const revokeSession = async (userId: string, sessionId: string): Promise<void> => {
  await Session.updateOne(
    { _id: sessionId, user: userId },
    { $set: { revokedAt: new Date() } },
  );
};

export const forgotPassword = async (email: string): Promise<void> => {
  const user = await User.findOne({ email });
  // Always report success so the endpoint cannot be used to enumerate accounts.
  if (!user) {
    logger.info({ email }, 'password reset requested for unknown email');
    return;
  }

  const token = randomToken(32);
  await AuthToken.deleteMany({ user: user._id, purpose: 'password_reset' });
  await AuthToken.create({
    user: user._id,
    workspace: user.workspace,
    purpose: 'password_reset',
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + 3600 * 1000),
  });

  await sendPasswordResetEmail(user.email, user.name, token);
};

export const resetPassword = async (token: string, password: string): Promise<void> => {
  const authToken = await AuthToken.findOne({
    tokenHash: sha256(token),
    purpose: 'password_reset',
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });

  if (!authToken) throw new BadRequestError('This reset link is invalid or has expired');

  const user = await User.findById(authToken.user).select('+passwordHash');
  if (!user) throw new NotFoundError('Account not found');

  user.passwordHash = await hashPassword(password);
  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  await user.save();

  authToken.usedAt = new Date();
  await authToken.save();

  // Invalidate all existing sessions after a password reset.
  await Session.updateMany(
    { user: user._id, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
};

export const verifyEmail = async (token: string): Promise<any> => {
  const authToken = await AuthToken.findOne({
    tokenHash: sha256(token),
    purpose: 'email_verification',
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });

  if (!authToken) throw new BadRequestError('This verification link is invalid or has expired');

  const user = await User.findById(authToken.user);
  if (!user) throw new NotFoundError('Account not found');

  user.isEmailVerified = true;
  user.emailVerifiedAt = new Date();
  await user.save();

  authToken.usedAt = new Date();
  await authToken.save();

  return user.toJSON();
};

export const resendVerificationEmail = async (userId: string): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('Account not found');
  if (user.isEmailVerified) throw new BadRequestError('Email is already verified');

  const token = randomToken(32);
  await AuthToken.deleteMany({ user: user._id, purpose: 'email_verification' });
  await AuthToken.create({
    user: user._id,
    workspace: user.workspace,
    purpose: 'email_verification',
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
  });
  await sendVerificationEmail(user.email, user.name, token);
};

/** Google OAuth: exchanges the auth code for a profile and signs the user in. */
export const googleLogin = async (params: {
  code: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<AuthResult> => {
  if (!googleConfig.configured) {
    throw new BadRequestError('Google sign-in is not configured on this environment');
  }

  const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
    code: params.code,
    client_id: googleConfig.clientId,
    client_secret: googleConfig.clientSecret,
    redirect_uri: googleConfig.callbackUrl,
    grant_type: 'authorization_code',
  });

  const { access_token: googleAccessToken } = tokenResponse.data;

  const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${googleAccessToken}` },
  });

  const { email, name, picture, sub: googleId, email_verified } = profileResponse.data;

  if (!email) throw new UnauthorizedError('Google account did not return an email address');

  let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

  if (!user) {
    const passwordHash = await hashPassword(randomToken(24));
    const userId = new mongoose.Types.ObjectId();

    const workspace = await createWorkspace({
      name: `${(name ?? email).split(' ')[0]}'s workspace`,
      ownerId: userId,
    });

    user = await User.create({
      _id: userId,
      name: name ?? email.split('@')[0],
      email: email.toLowerCase(),
      passwordHash,
      googleId,
      avatarUrl: picture,
      workspace: workspace._id,
      platformRole: 'user',
      isEmailVerified: Boolean(email_verified),
      emailVerifiedAt: email_verified ? new Date() : undefined,
    });

    await sendWelcomeEmail(user.email, user.name);
  } else if (!user.googleId) {
    user.googleId = googleId;
    if (!user.avatarUrl && picture) user.avatarUrl = picture;
    await user.save();
  }

  user.lastLoginAt = new Date();
  user.lastActiveAt = new Date();
  await user.save();

  const tokens = await issueTokens({
    userId: user._id.toString(),
    email: user.email,
    role: 'owner',
    workspaceId: user.workspace.toString(),
    userAgent: params.userAgent,
    ipAddress: params.ipAddress,
  });

  return { ...tokens, user: user.toJSON() };
};

export const googleOAuthUrl = (state: string): string => {
  if (!googleConfig.configured) throw new BadRequestError('Google sign-in is not configured');
  const params = new URLSearchParams({
    client_id: googleConfig.clientId,
    redirect_uri: googleConfig.callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    state,
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

export const randomState = (): string => crypto.randomBytes(16).toString('base64url');

/** Decodes a refresh token without validating it against the session store. */
export const decodeRefreshToken = (token: string): { sub: string; sessionId: string } => {
  const payload = verifyRefreshToken(token);
  return { sub: payload.sub, sessionId: payload.sessionId };
};
