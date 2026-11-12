import crypto from 'crypto';
import { InstagramAccount, type IInstagramAccount } from '../models/InstagramAccount';
import { InstagramToken } from '../models/InstagramToken';
import { metaGraph } from './meta.service';
import { metaConfig } from '../config/env';
import { decrypt, encrypt } from '../utils/crypto';
import { BadRequestError, IntegrationError, NotFoundError } from '../utils/errors';
import { logger } from '../config/logger';
import type { InstagramAccountType } from '../types/enums';

export interface InstagramProfile {
  igUserId: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
  biography?: string;
  website?: string;
  accountType: InstagramAccountType;
}

interface IgBusinessAccount {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  biography?: string;
  website?: string;
  ig_business_category?: string;
}

const IG_ACCOUNT_FIELDS = [
  'id',
  'username',
  'name',
  'profile_picture_url',
  'followers_count',
  'follows_count',
  'media_count',
  'biography',
  'website',
].join(',');

/** Fetches the Instagram Professional account linked to a Facebook Page. */
export const fetchInstagramProfile = async (
  igUserId: string,
  accessToken: string,
): Promise<InstagramProfile> => {
  const res = await metaGraph.get<{ id: string }>(`/${igUserId}`, {
    fields: IG_ACCOUNT_FIELDS,
    access_token: accessToken,
  });
  if (res.error) throw new IntegrationError(res.error.message, 400, res.error);
  const data = res.data as unknown as IgBusinessAccount;
  if (!data?.id) throw new IntegrationError('Instagram account not found for this token');

  return {
    igUserId: data.id,
    username: data.username,
    name: data.name,
    profilePictureUrl: data.profile_picture_url,
    followersCount: data.followers_count ?? 0,
    followsCount: data.follows_count ?? 0,
    mediaCount: data.media_count ?? 0,
    biography: data.biography,
    website: data.website,
    accountType: 'BUSINESS',
  };
};

/** Lists the Instagram business accounts available to the authenticated user. */
export const listInstagramBusinessAccounts = async (
  userAccessToken: string,
): Promise<Array<InstagramProfile & { pageId: string; pageName?: string }>> => {
  const pagesRes = await metaGraph.get<{
    id: string;
    name: string;
    access_token: string;
    tasks?: string[];
  }>('/me/accounts', {
    access_token: userAccessToken,
    fields: 'id,name,access_token,tasks,instagram_business_account{id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography,website}',
  });

  if (pagesRes.error) throw new IntegrationError(pagesRes.error.message, 400, pagesRes.error);

  const results: Array<InstagramProfile & { pageId: string; pageName?: string }> = [];
  const pages = (pagesRes.data ?? []) as Array<{
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: IgBusinessAccount;
  }>;
  for (const page of pages) {
    const ig = (page as unknown as { instagram_business_account?: IgBusinessAccount })
      .instagram_business_account;
    if (!ig?.id) continue;
    results.push({
      igUserId: ig.id,
      username: ig.username,
      name: ig.name,
      profilePictureUrl: ig.profile_picture_url,
      followersCount: ig.followers_count ?? 0,
      followsCount: ig.follows_count ?? 0,
      mediaCount: ig.media_count ?? 0,
      biography: ig.biography,
      website: ig.website,
      accountType: 'BUSINESS',
      pageId: page.id,
      pageName: page.name,
    });
  }
  return results;
};

/** Persists a connected Instagram account together with its encrypted token. */
export const upsertInstagramAccount = async (params: {
  workspaceId: string;
  connectedBy: string;
  profile: InstagramProfile;
  accessToken: string;
  pageId?: string;
  pageName?: string;
  tokenType?: 'user' | 'page' | 'system_user';
  expiresAt?: Date;
  scopes?: string[];
  meta?: Record<string, unknown>;
}): Promise<IInstagramAccount> => {
  const { workspaceId, profile } = params;

  const account = await InstagramAccount.findOneAndUpdate(
    { workspace: workspaceId, igUserId: profile.igUserId },
    {
      $set: {
        connectedBy: params.connectedBy,
        username: profile.username,
        name: profile.name,
        profilePictureUrl: profile.profilePictureUrl,
        followersCount: profile.followersCount,
        followsCount: profile.followsCount,
        mediaCount: profile.mediaCount,
        biography: profile.biography,
        website: profile.website,
        accountType: profile.accountType,
        pageId: params.pageId,
        pageName: params.pageName,
        connectionStatus: 'connected',
        lastSyncedAt: new Date(),
        lastError: undefined,
      },
      $setOnInsert: { workspace: workspaceId, connectedAt: new Date() },
    },
    { new: true, upsert: true },
  );

  await InstagramToken.findOneAndUpdate(
    { instagramAccount: account._id },
    {
      $set: {
        workspace: workspaceId,
        accessTokenEncrypted: encrypt(params.accessToken),
        tokenType: params.tokenType ?? 'page',
        expiresAt: params.expiresAt,
        scopes: params.scopes ?? [],
        isValid: true,
        lastRefreshedAt: new Date(),
        lastError: undefined,
        meta: params.meta ?? {},
      },
    },
    { upsert: true, new: true },
  );

  logger.info(
    { workspaceId, igUserId: profile.igUserId, username: profile.username },
    'instagram account connected',
  );
  return account;
};

/** Returns the decrypted access token for an account. Internal use only. */
export const getAccessToken = async (instagramAccountId: string): Promise<string> => {
  const token = await InstagramToken.findOne({ instagramAccount: instagramAccountId }).select(
    '+accessTokenEncrypted +longLivedTokenEncrypted',
  );
  if (!token) throw new NotFoundError('No access token stored for this Instagram account');
  return decrypt(token.accessTokenEncrypted);
};

/** Returns the decrypted long-lived token when one is available. */
export const getLongLivedToken = async (instagramAccountId: string): Promise<string | null> => {
  const token = await InstagramToken.findOne({ instagramAccount: instagramAccountId }).select(
    '+accessTokenEncrypted +longLivedTokenEncrypted',
  );
  if (!token?.longLivedTokenEncrypted) return null;
  return decrypt(token.longLivedTokenEncrypted);
};

/** Refreshes an expired token using the stored long-lived token. */
export const refreshAccessToken = async (instagramAccountId: string): Promise<boolean> => {
  const longLived = await getLongLivedToken(instagramAccountId);
  if (!longLived) return false;

  const res = await metaGraph.get<{ access_token: string; expires_in: number }>(
    '/oauth/access_token',
    {
      grant_type: 'fb_exchange_token',
      client_id: metaConfig.appId,
      client_secret: metaConfig.appSecret,
      fb_exchange_token: longLived,
    },
  );
  if (!res.data?.access_token) return false;

  await InstagramToken.updateOne(
    { instagramAccount: instagramAccountId },
    {
      $set: {
        accessTokenEncrypted: encrypt(res.data.access_token),
        expiresAt: new Date(Date.now() + (res.data.expires_in ?? 5_184_000) * 1000),
        isValid: true,
        lastRefreshedAt: new Date(),
      },
    },
  );
  return true;
};

export const disconnectInstagramAccount = async (
  workspaceId: string,
  accountId: string,
): Promise<void> => {
  const account = await InstagramAccount.findOne({ _id: accountId, workspace: workspaceId });
  if (!account) throw new NotFoundError('Instagram account not found');

  await InstagramToken.deleteMany({ instagramAccount: account._id });
  await account.deleteOne();
};

/** OAuth state is signed so it cannot be tampered with between the two legs. */
export const createOAuthState = (workspaceId: string, userId: string): string => {
  const payload = `${workspaceId}.${userId}.${Date.now()}`;
  const signature = crypto.createHmac('sha256', process.env.JWT_ACCESS_SECRET ?? 'dev').update(payload).digest('base64url');
  return Buffer.from(`${payload}.${signature}`).toString('base64url');
};

export const parseOAuthState = (state: string): { workspaceId: string; userId: string } => {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const [workspaceId, userId, timestamp, signature] = decoded.split('.');
    const payload = `${workspaceId}.${userId}.${timestamp}`;
    const expected = crypto
      .createHmac('sha256', process.env.JWT_ACCESS_SECRET ?? 'dev')
      .update(payload)
      .digest('base64url');
    if (signature !== expected) throw new Error('bad signature');
    if (Date.now() - Number(timestamp) > 15 * 60 * 1000) throw new Error('expired state');
    return { workspaceId, userId };
  } catch {
    throw new BadRequestError('Invalid OAuth state');
  }
};
