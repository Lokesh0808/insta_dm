import axios, { type AxiosInstance } from 'axios';
import { metaConfig } from '../config/env';
import { logger } from '../config/logger';
import { IntegrationError } from '../utils/errors';

export interface GraphResponse<T = Record<string, unknown>> {
  data?: T;
  paging?: { cursors?: { before?: string; after?: string }; next?: string; previous?: string };
  error?: {
    message: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

/**
 * Thin, well-typed wrapper around the official Meta Graph API.
 * Only official endpoints are used — no scraping, no unofficial APIs.
 */
class MetaGraphClient {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: metaConfig.graphBaseUrl,
      timeout: 20_000,
      headers: { Accept: 'application/json' },
    });

    this.http.interceptors.response.use(
      (res) => res,
      (error) => {
        const data = error?.response?.data;
        logger.error(
          {
            status: error?.response?.status,
            url: error?.config?.url,
            metaError: data?.error?.message,
            metaCode: data?.error?.code,
          },
          'meta graph request failed',
        );
        throw new IntegrationError(
          data?.error?.message ?? 'Meta Graph API request failed',
          error?.response?.status ?? 502,
          data?.error,
        );
      },
    );
  }

  get configured(): boolean {
    return metaConfig.configured;
  }

  async get<T = Record<string, unknown>>(
    path: string,
    params: Record<string, unknown> = {},
  ): Promise<GraphResponse<T>> {
    const res = await this.http.get<GraphResponse<T>>(path, { params });
    return res.data;
  }

  async post<T = Record<string, unknown>>(
    path: string,
    data: Record<string, unknown> = {},
    params: Record<string, unknown> = {},
  ): Promise<GraphResponse<T>> {
    const res = await this.http.post<GraphResponse<T>>(path, data, { params });
    return res.data;
  }

  async delete<T = Record<string, unknown>>(
    path: string,
    params: Record<string, unknown> = {},
  ): Promise<GraphResponse<T>> {
    const res = await this.http.delete<GraphResponse<T>>(path, { params });
    return res.data;
  }

  /** Exchanges a short-lived code for a long-lived token. */
  async exchangeCodeForLongLivedToken(code: string, redirectUri: string): Promise<string> {
    const res = await this.get<{ access_token: string; expires_in: number }>('/oauth/access_token', {
      client_id: metaConfig.appId,
      client_secret: metaConfig.appSecret,
      redirect_uri: redirectUri,
      code,
    });
    if (!res.data?.access_token) {
      throw new IntegrationError('Meta did not return an access token');
    }
    return res.data.access_token;
  }

  /** Inspects a token's validity, expiry and granted scopes. */
  async debugToken(token: string): Promise<{
    isValid: boolean;
    expiresAt?: Date;
    scopes: string[];
    userId?: string;
    appId?: string;
  }> {
    const res = await this.get<{
      data: {
        is_valid: boolean;
        expires_at?: number;
        scopes?: string[];
        user_id?: string;
        app_id?: string;
      };
    }>('/debug_token', {
      input_token: token,
      access_token: `${metaConfig.appId}|${metaConfig.appSecret}`,
    });
    const data = res.data?.data;
    return {
      isValid: Boolean(data?.is_valid),
      expiresAt: data?.expires_at ? new Date(data.expires_at * 1000) : undefined,
      scopes: data?.scopes ?? [],
      userId: data?.user_id,
      appId: data?.app_id,
    };
  }

  /**
   * Exchanges a user access token for a long-lived Page token.
   * Required to send DMs on behalf of an Instagram Professional account.
   */
  async getPageAccessToken(userToken: string, pageId: string): Promise<string> {
    const res = await this.get<{ access_token: string }>(
      `/${pageId}/access_token`,
      { access_token: userToken },
    );
    if (!res.data?.access_token) throw new IntegrationError('Could not obtain a page access token');
    return res.data.access_token;
  }
}

export const metaGraph = new MetaGraphClient();

/** Builds the Meta OAuth dialog URL used to connect an Instagram account. */
export const buildInstagramOAuthUrl = (state: string): string => {
  const params = new URLSearchParams({
    client_id: metaConfig.appId,
    redirect_uri: metaConfig.redirectUri,
    response_type: 'code',
    scope: metaConfig.scopes.join(','),
    state,
  });
  return `${metaConfig.oauthDialogUrl}?${params.toString()}`;
};
