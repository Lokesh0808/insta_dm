import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

const runtimeConfig = (globalThis as any).window?.__INSTAFLOW_CONFIG__ ?? {};

const resolveApiUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  if (runtimeConfig.API_URL) return runtimeConfig.API_URL.replace(/\/$/, '');
  return '/api';
};

export const API_URL = resolveApiUrl();

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const TOKEN_KEY = 'instaflow.accessToken';
const REFRESH_KEY = 'instaflow.refreshToken';

export const tokenStorage = {
  getAccess: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  getRefresh: (): string | null => {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  set: (accessToken: string, refreshToken?: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, accessToken);
      if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    } catch {
      /* storage unavailable — session only */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      /* ignore */
    }
  },
};

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: { code: string; message: string; details?: unknown };
  meta?: Record<string, unknown>;
}

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// --- Request interceptor -----------------------------------------------------
api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const csrf = typeof document !== 'undefined' ? document.cookie.match(/csrfToken=([^;]+)/)?.[1] : null;
  if (csrf) config.headers['X-CSRF-Token'] = decodeURIComponent(csrf);
  return config;
});

// --- Response interceptor (silent token refresh) ------------------------------
let refreshing: Promise<string | null> | null = null;
let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: () => void): void => {
  onUnauthorized = handler;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };

    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      const refreshToken = tokenStorage.getRefresh();
      if (refreshToken) {
        try {
          refreshing =
            refreshing ??
            axios
              .post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
                `${API_URL}/auth/refresh`,
                { refreshToken },
                { headers: { 'Content-Type': 'application/json' }, withCredentials: true },
              )
              .then((res) => {
                const { accessToken, refreshToken: newRefresh } = res.data.data;
                tokenStorage.set(accessToken, newRefresh ?? refreshToken);
                return accessToken;
              })
              .finally(() => {
                refreshing = null;
              });

          const accessToken = await refreshing;
          if (accessToken) {
            original.headers = original.headers ?? {};
            original.headers.Authorization = `Bearer ${accessToken}`;
            return api(original);
          }
        } catch {
          tokenStorage.clear();
          onUnauthorized?.();
          return Promise.reject(
            new ApiError('Your session has expired. Please sign in again.', 401, 'UNAUTHORIZED'),
          );
        }
      }
    }

    const payload = error.response?.data as ApiResponse<unknown> | undefined;
    const apiMessage = payload?.error?.message;
    const status = error.response?.status ?? 0;
    const code = payload?.error?.code ?? 'NETWORK_ERROR';

    if (!error.response) {
      return Promise.reject(
        new ApiError('Unable to reach the server. Check your connection and try again.', 0, code),
      );
    }

    return Promise.reject(
      new ApiError(apiMessage ?? 'Something went wrong. Please try again.', status, code, payload?.error?.details),
    );
  },
);

export const request = async <T>(
  config: AxiosRequestConfig,
): Promise<ApiResponse<T>> => {
  const response = await api.request<ApiResponse<T>>(config);
  return response.data;
};

export const get = <T>(url: string, config?: AxiosRequestConfig) =>
  request<T>({ ...config, method: 'GET', url });

export const post = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  request<T>({ ...config, method: 'POST', url, data });

export const put = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  request<T>({ ...config, method: 'PUT', url, data });

export const patch = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
  request<T>({ ...config, method: 'PATCH', url, data });

export const del = <T>(url: string, config?: AxiosRequestConfig) =>
  request<T>({ ...config, method: 'DELETE', url });

export const buildQuery = (params: Record<string, unknown>): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.append(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};
