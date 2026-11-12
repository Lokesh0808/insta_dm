import { buildQuery, del, get, patch, post, put } from './api';
import type {
  Automation,
  AutomationExecution,
  Conversation,
  InstagramAccount,
  Lead,
  LinkInBioPage,
  Message,
  Paginated,
  Payment,
  Plan,
  Subscription,
  UsageSnapshot,
} from '@/types';

// --- Authentication ----------------------------------------------------------
export const authService = {
  register: (payload: {
    name: string;
    email: string;
    password: string;
    workspaceName?: string;
  }) => post<{ user: unknown; accessToken: string; refreshToken: string; expiresIn: string }>('/auth/register', payload),

  login: (payload: { email: string; password: string }) =>
    post<{ user: unknown; accessToken: string; refreshToken: string; expiresIn: string }>('/auth/login', payload),

  logout: (refreshToken?: string) => post<unknown>('/auth/logout', { refreshToken }),

  me: () => get<{ user: unknown }>('/auth/me'),

  updateProfile: (payload: Record<string, unknown>) => patch<{ user: unknown }>('/auth/me', payload),

  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    post<unknown>('/auth/change-password', payload),

  forgotPassword: (email: string) => post<unknown>('/auth/forgot-password', { email }),

  resetPassword: (payload: { token: string; password: string }) =>
    post<unknown>('/auth/reset-password', payload),

  verifyEmail: (token: string) => post<{ user: unknown }>('/auth/verify-email', { token }),

  resendVerification: () => post<unknown>('/auth/resend-verification'),

  listSessions: () => get<{ sessions: Array<Record<string, unknown>> }>('/auth/sessions'),

  revokeSession: (id: string) => del<unknown>(`/auth/sessions/${id}`),

  googleStart: () => get<{ url: string }>('/auth/google'),
};

// --- Instagram ---------------------------------------------------------------
export const instagramService = {
  connect: () => get<{ url: string }>('/instagram/connect'),
  accounts: () => get<{ accounts: InstagramAccount[] }>('/instagram/accounts'),
  account: (id: string) => get<{ account: InstagramAccount }>(`/instagram/accounts/${id}`),
  remove: (id: string) => del<unknown>(`/instagram/accounts/${id}`),
  sync: (id: string) => post<{ account: InstagramAccount }>(`/instagram/accounts/${id}/sync`),
  updateSettings: (id: string, payload: Record<string, unknown>) =>
    patch<{ account: InstagramAccount }>(`/instagram/accounts/${id}`, payload),
};

// --- Automations -------------------------------------------------------------
export const automationService = {
  list: (params: Record<string, unknown> = {}) =>
    get<{ automations: Automation[]; meta: Paginated<Automation>['meta'] }>(
      `/automations${buildQuery(params)}`,
    ),
  get: (id: string) => get<{ automation: Automation }>(`/automations/${id}`),
  create: (payload: Record<string, unknown>) => post<{ automation: Automation }>('/automations', payload),
  update: (id: string, payload: Record<string, unknown>) =>
    put<{ automation: Automation }>(`/automations/${id}`, payload),
  toggle: (id: string, isActive: boolean) =>
    patch<{ automation: Automation }>(`/automations/${id}/toggle`, { isActive }),
  remove: (id: string) => del<unknown>(`/automations/${id}`),
  duplicate: (id: string) => post<{ automation: Automation }>(`/automations/${id}/duplicate`),
  executions: (id: string, params: Record<string, unknown> = {}) =>
    get<{ executions: AutomationExecution[]; meta: Paginated<AutomationExecution>['meta'] }>(
      `/automations/${id}/executions${buildQuery(params)}`,
    ),
  test: (id: string, text: string, username?: string) =>
    post<{ matched: boolean; reply: string; triggers: unknown[] }>(`/automations/${id}/test`, {
      text,
      username,
    }),
};

// --- Conversations ------------------------------------------------------------
export const conversationService = {
  list: (params: Record<string, unknown> = {}) =>
    get<{ conversations: Conversation[]; meta: Paginated<Conversation>['meta'] }>(
      `/conversations${buildQuery(params)}`,
    ),
  get: (id: string) =>
    get<{ conversation: Conversation; messages: Message[] }>(`/conversations/${id}`),
  markRead: (id: string) => post<unknown>(`/conversations/${id}/mark-read`),
  reply: (id: string, text: string) => post<{ messageId: string }>(`/conversations/${id}/reply`, { text }),
  updateStatus: (id: string, payload: { status: 'open' | 'closed'; tags?: string[] }) =>
    patch<{ conversation: Conversation }>(`/conversations/${id}`, payload),
};

// --- Leads -------------------------------------------------------------------
export const leadService = {
  list: (params: Record<string, unknown> = {}) =>
    get<{ leads: Lead[]; meta: Paginated<Lead>['meta'] }>(`/leads${buildQuery(params)}`),
  get: (id: string) => get<{ lead: Lead }>(`/leads/${id}`),
  create: (payload: Record<string, unknown>) => post<{ lead: Lead }>('/leads', payload),
  update: (id: string, payload: Record<string, unknown>) => patch<{ lead: Lead }>(`/leads/${id}`, payload),
  remove: (id: string) => del<unknown>(`/leads/${id}`),
  tags: () => get<{ tags: string[] }>('/leads/tags'),
  exportUrl: (params: Record<string, unknown> = {}) => `/leads/export${buildQuery(params)}`,
};

// --- Analytics ----------------------------------------------------------------
export const analyticsService = {
  overview: (days = 30) => get<Record<string, unknown>>(`/analytics/overview${buildQuery({ days })}`),
  dms: (days = 30) => get<Record<string, unknown>>(`/analytics/dms${buildQuery({ days })}`),
  leads: (days = 30) => get<Record<string, unknown>>(`/analytics/leads${buildQuery({ days })}`),
  usage: () => get<{ snapshot: UsageSnapshot; history: Array<Record<string, unknown>> }>('/analytics/usage'),
};

// --- Billing ------------------------------------------------------------------
export const billingService = {
  plans: () => get<{ plans: Plan[] }>('/billing/plans'),
  createOrder: (plan: string, billingCycle: 'monthly' | 'yearly') =>
    post<{ order: { orderId: string; amount: number; currency: string; keyId: string } }>(
      '/billing/create-order',
      { plan, billingCycle },
    ),
  verifyPayment: (payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    plan: string;
    billingCycle: 'monthly' | 'yearly';
  }) => post<{ subscription: Subscription }>('/billing/verify-payment', payload),
  subscription: () => get<{ subscription: Subscription; usage: UsageSnapshot }>('/billing/subscription'),
  history: () => get<{ payments: Payment[] }>('/billing/history'),
  cancel: () => post<unknown>('/billing/cancel'),
  downgrade: (plan: string, billingCycle: 'monthly' | 'yearly' = 'monthly') =>
    post<{ subscription: Subscription }>('/billing/downgrade', { plan, billingCycle }),
  activateManually: (plan: string, billingCycle: 'monthly' | 'yearly' = 'monthly') =>
    post<{ subscription: Subscription }>('/billing/activate-manually', { plan, billingCycle }),
};

// --- Link-in-bio --------------------------------------------------------------
export const linkInBioService = {
  list: () => get<{ pages: LinkInBioPage[] }>('/link-in-bio'),
  get: (id: string) => get<{ page: LinkInBioPage }>(`/link-in-bio/${id}`),
  create: (payload: Record<string, unknown>) => post<{ page: LinkInBioPage }>('/link-in-bio', payload),
  update: (id: string, payload: Record<string, unknown>) =>
    put<{ page: LinkInBioPage }>(`/link-in-bio/${id}`, payload),
  remove: (id: string) => del<unknown>(`/link-in-bio/${id}`),
  analytics: (id: string, days = 30) =>
    get<Record<string, unknown>>(`/link-in-bio/${id}/analytics${buildQuery({ days })}`),
  publish: (id: string) => post<{ page: LinkInBioPage }>(`/link-in-bio/${id}/publish`),
  unpublish: (id: string) => post<{ page: LinkInBioPage }>(`/link-in-bio/${id}/unpublish`),
  publicPage: (slug: string) => get<{ page: Record<string, unknown> }>(`/p/${slug}`),
};

// --- Admin --------------------------------------------------------------------
export const adminService = {
  overview: () => get<Record<string, unknown>>('/admin/overview'),
  users: (params: Record<string, unknown> = {}) =>
    get<{ users: Array<Record<string, unknown>>; meta: Paginated<unknown>['meta'] }>(
      `/admin/users${buildQuery(params)}`,
    ),
  updateUser: (id: string, payload: Record<string, unknown>) =>
    patch<{ user: unknown }>(`/admin/users/${id}`, payload),
  subscriptions: (params: Record<string, unknown> = {}) =>
    get<{ subscriptions: Array<Record<string, unknown>>; meta: Paginated<unknown>['meta'] }>(
      `/admin/subscriptions${buildQuery(params)}`,
    ),
  payments: (params: Record<string, unknown> = {}) =>
    get<{ payments: Array<Record<string, unknown>>; meta: Paginated<unknown>['meta'] }>(
      `/admin/payments${buildQuery(params)}`,
    ),
  workspaces: () => get<{ workspaces: Array<Record<string, unknown>> }>('/admin/workspaces'),
  usage: () => get<Record<string, unknown>>('/admin/usage'),
  health: () => get<Record<string, unknown>>('/admin/health'),
};
