import type { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { asyncHandler } from '../utils/helpers';
import { accessCookieOptions, refreshCookieOptions } from '../utils/jwt';
import { csrfToken } from '../middleware/csrf';
import { BadRequestError } from '../utils/errors';
import { env } from '../config/env';

const setAuthCookies = (req: Request, res: Response, accessToken: string, refreshToken: string) => {
  res.cookie('accessToken', accessToken, accessCookieOptions);
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);
  res.cookie('csrfToken', csrfToken(req), { httpOnly: false, sameSite: 'lax', secure: env.COOKIE_SECURE, path: '/' });
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register({
    ...req.body,
    ipAddress: req.ip,
    userAgent: req.header('user-agent'),
  });
  setAuthCookies(req, res, result.accessToken, result.refreshToken);
  res.status(201).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login({
    email: req.body.email,
    password: req.body.password,
    ipAddress: req.ip,
    userAgent: req.header('user-agent'),
  });
  setAuthCookies(req, res, result.accessToken, result.refreshToken);
  res.json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    },
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken =
    req.body?.refreshToken ?? (req.cookies as Record<string, string> | undefined)?.refreshToken;

  if (refreshToken) {
    try {
      const payload = authService.decodeRefreshToken(refreshToken);
      await authService.logout(payload.sessionId, payload.sub);
    } catch {
      /* token already invalid — clearing cookies is enough */
    }
  }

  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.clearCookie('csrfToken', { path: '/' });
  res.json({ success: true, message: 'Signed out successfully' });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken =
    req.body?.refreshToken ?? (req.cookies as Record<string, string> | undefined)?.refreshToken;
  if (!refreshToken) throw new BadRequestError('Refresh token is missing');

  const result = await authService.refreshSession(refreshToken);
  setAuthCookies(req, res, result.accessToken, result.refreshToken);
  res.json({
    success: true,
    data: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: result.user,
    },
  });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body.email);
  res.json({
    success: true,
    message: 'If an account exists for that email, a reset link has been sent.',
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.password);
  res.json({ success: true, message: 'Password updated successfully' });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.verifyEmail(req.body.token);
  res.json({ success: true, data: { user } });
});

export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  await authService.resendVerificationEmail(req.auth!.userId);
  res.json({ success: true, message: 'Verification email sent' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const { User } = await import('../models/User');
  const user = await User.findById(req.auth!.userId);
  res.json({ success: true, data: { user: user?.toJSON() } });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { User } = await import('../models/User');
  const user = await User.findById(req.auth!.userId);
  if (!user) throw new BadRequestError('User not found');

  const { name, phone, avatarUrl, preferences } = req.body;
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
  if (preferences) {
    user.preferences = {
      ...user.preferences,
      ...preferences,
      notifications: {
        ...user.preferences.notifications,
        ...(preferences.notifications ?? {}),
      },
    } as any;
  }
  await user.save();
  res.json({ success: true, data: { user: user.toJSON() } });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { User } = await import('../models/User');
  const { verifyPassword, hashPassword } = await import('../utils/password');
  const user = await User.findById(req.auth!.userId).select('+passwordHash');
  if (!user) throw new BadRequestError('User not found');

  const valid = await verifyPassword(req.body.currentPassword, user.passwordHash ?? '');
  if (!valid) throw new BadRequestError('Current password is incorrect');

  user.passwordHash = await hashPassword(req.body.newPassword);
  await user.save();
  await authService.logoutAll(user._id.toString());

  res.json({ success: true, message: 'Password changed — please sign in again' });
});

export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const sessions = await authService.listSessions(req.auth!.userId);
  res.json({ success: true, data: { sessions } });
});

export const revokeSession = asyncHandler(async (req: Request, res: Response) => {
  await authService.revokeSession(req.auth!.userId, req.params.id);
  res.json({ success: true, message: 'Session revoked' });
});

export const googleStart = asyncHandler(async (req: Request, res: Response) => {
  const state = authService.randomState();
  res.cookie('google_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: env.COOKIE_SECURE, path: '/' });
  res.json({ success: true, data: { url: authService.googleOAuthUrl(state) } });
});

export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const expected = (req.cookies as Record<string, string> | undefined)?.google_oauth_state;
  if (!expected || expected !== req.query.state) {
    throw new BadRequestError('Invalid OAuth state');
  }

  const result = await authService.googleLogin({
    code: String(req.query.code ?? ''),
    ipAddress: req.ip,
    userAgent: req.header('user-agent'),
  });

  res.clearCookie('google_oauth_state', { path: '/' });

  // Redirect back to the SPA with the tokens in the URL fragment (never logged).
  const redirect = new URL(env.CLIENT_URL);
  redirect.hash = new URLSearchParams({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  }).toString();

  res.redirect(redirect.toString());
});
