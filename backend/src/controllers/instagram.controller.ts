import type { Request, Response } from 'express';
import {
  createOAuthState,
  disconnectInstagramAccount,
  fetchInstagramProfile,
  listInstagramBusinessAccounts,
  parseOAuthState,
  upsertInstagramAccount,
} from '../services/instagram.service';
import { buildInstagramOAuthUrl, metaGraph } from '../services/meta.service';
import { InstagramAccount } from '../models/InstagramAccount';
import { InstagramToken } from '../models/InstagramToken';
import { asyncHandler } from '../utils/helpers';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { env } from '../config/env';
import { assertUsageLimit } from '../services/usage.service';

/** Step 1 — redirect the user to Meta's OAuth dialog. */
export const connect = asyncHandler(async (req: Request, res: Response) => {
  if (!metaGraph.configured) {
    throw new BadRequestError(
      'Instagram integration is not configured. Set META_APP_ID and META_APP_SECRET on the server.',
    );
  }

  const state = createOAuthState(req.auth!.workspaceId, req.auth!.userId);
  res.json({ success: true, data: { url: buildInstagramOAuthUrl(state) } });
});

/** Step 2 — Meta redirects back with a code that we exchange for a token. */
export const callback = asyncHandler(async (req: Request, res: Response) => {
  const code = String(req.query.code ?? '');
  const state = String(req.query.state ?? '');

  if (!code) throw new BadRequestError('Missing authorization code');
  const { workspaceId, userId } = parseOAuthState(state);

  const userAccessToken = await metaGraph.exchangeCodeForLongLivedToken(code, metaConfigRedirect());

  // Find every Instagram Professional account the user manages.
  const accounts = await listInstagramBusinessAccounts(userAccessToken);

  if (accounts.length === 0) {
    return res.redirect(
      `${env.CLIENT_URL}/dashboard/instagram?error=ig_not_found&message=${encodeURIComponent(
        'No Instagram Professional account is linked to your Facebook account.',
      )}`,
    );
  }

  // Enforce the plan limit before connecting.
  const { InstagramAccount: AccountModel } = await import('../models/InstagramAccount');
  const existing = await AccountModel.countDocuments({ workspace: workspaceId });
  if (existing + accounts.length > 1) {
    await assertUsageLimit(workspaceId, 'instagram_accounts');
  }

  const connected: Array<{ igUserId: string; username: string }> = [];

  for (const account of accounts) {
    let pageToken = userAccessToken;
    try {
      pageToken = await metaGraph.getPageAccessToken(userAccessToken, account.pageId);
    } catch {
      pageToken = userAccessToken;
    }

    const profile = await fetchInstagramProfile(account.igUserId, pageToken);

    await upsertInstagramAccount({
      workspaceId,
      connectedBy: userId,
      profile,
      accessToken: pageToken,
      pageId: account.pageId,
      pageName: account.pageName,
      tokenType: 'page',
      scopes: metaConfigScopes(),
      meta: { graphVersion: metaConfigGraphVersion(), appId: metaConfigAppId(), pageId: account.pageId },
    });

    connected.push({ igUserId: account.igUserId, username: account.username });
  }

  res.redirect(
    `${env.CLIENT_URL}/dashboard/instagram?connected=${encodeURIComponent(
      String(connected.length),
    )}`,
  );
});

export const listAccounts = asyncHandler(async (req: Request, res: Response) => {
  const accounts = await InstagramAccount.find({ workspace: req.auth!.workspaceId })
    .sort({ createdAt: -1 })
    .lean();

  const tokens = await InstagramToken.find({
    workspace: req.auth!.workspaceId,
    instagramAccount: { $in: accounts.map((a) => a._id) },
  })
    .select('instagramAccount expiresAt isValid scopes tokenType lastRefreshedAt')
    .lean();

  const tokenMap = new Map(tokens.map((t) => [t.instagramAccount.toString(), t]));

  res.json({
    success: true,
    data: {
      accounts: accounts.map((account) => {
        const token = tokenMap.get(account._id.toString());
        return {
          id: account._id.toString(),
          igUserId: account.igUserId,
          username: account.username,
          name: account.name,
          profilePictureUrl: account.profilePictureUrl,
          followersCount: account.followersCount,
          followsCount: account.followsCount,
          mediaCount: account.mediaCount,
          accountType: account.accountType,
          pageName: account.pageName,
          connectionStatus: account.connectionStatus,
          connectedAt: account.connectedAt,
          lastSyncedAt: account.lastSyncedAt,
          trackedMediaIds: account.trackedMediaIds,
          settings: account.settings,
          token: token
            ? {
                valid: token.isValid,
                expiresAt: token.expiresAt,
                scopes: token.scopes,
                type: token.tokenType,
                lastRefreshedAt: token.lastRefreshedAt,
              }
            : null,
        };
      }),
    },
  });
});

export const getAccount = asyncHandler(async (req: Request, res: Response) => {
  const account = await InstagramAccount.findOne({
    _id: req.params.id,
    workspace: req.auth!.workspaceId,
  }).lean();
  if (!account) throw new NotFoundError('Instagram account not found');
  res.json({ success: true, data: { account } });
});

export const removeAccount = asyncHandler(async (req: Request, res: Response) => {
  await disconnectInstagramAccount(req.auth!.workspaceId, req.params.id);
  res.json({ success: true, message: 'Instagram account disconnected' });
});

export const updateAccountSettings = asyncHandler(async (req: Request, res: Response) => {
  const account = await InstagramAccount.findOneAndUpdate(
    { _id: req.params.id, workspace: req.auth!.workspaceId },
    {
      $set: {
        'settings.defaultResponseDelaySeconds': Number(req.body.defaultResponseDelaySeconds ?? 2),
        'settings.pauseAutomations': Boolean(req.body.pauseAutomations),
        'settings.respectMessagingWindow': req.body.respectMessagingWindow !== false,
      },
    },
    { new: true },
  );
  if (!account) throw new NotFoundError('Instagram account not found');
  res.json({ success: true, data: { account } });
});

export const syncAccount = asyncHandler(async (req: Request, res: Response) => {
  const account = await InstagramAccount.findOne({
    _id: req.params.id,
    workspace: req.auth!.workspaceId,
  });
  if (!account) throw new NotFoundError('Instagram account not found');

  const { getAccessToken } = await import('../services/instagram.service');
  const token = await getAccessToken(account._id.toString());
  const profile = await fetchInstagramProfile(account.igUserId, token);

  account.followersCount = profile.followersCount;
  account.followsCount = profile.followsCount;
  account.mediaCount = profile.mediaCount;
  account.name = profile.name ?? account.name;
  account.profilePictureUrl = profile.profilePictureUrl ?? account.profilePictureUrl;
  account.biography = profile.biography ?? account.biography;
  account.website = profile.website ?? account.website;
  account.lastSyncedAt = new Date();
  account.connectionStatus = 'connected';
  await account.save();

  res.json({ success: true, data: { account } });
});

// --- small helpers to avoid importing the whole config module repeatedly ----
const metaConfigRedirect = (): string => env.META_REDIRECT_URI;
const metaConfigScopes = (): string[] => env.META_SCOPES.split(',').filter(Boolean);
const metaConfigGraphVersion = (): string => env.META_GRAPH_VERSION;
const metaConfigAppId = (): string => env.META_APP_ID;
