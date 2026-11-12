export type PlatformRole = 'user' | 'admin' | 'superadmin';
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
  platformRole: PlatformRole;
  isEmailVerified: boolean;
  isSuspended: boolean;
  lastLoginAt?: string;
  lastActiveAt?: string;
  onboardingCompleted: boolean;
  preferences?: {
    theme: 'light' | 'dark' | 'system';
    timezone: string;
    notifications: {
      email: boolean;
      inApp: boolean;
      leadAlerts: boolean;
      usageAlerts: boolean;
    };
  };
  workspace?: { id?: string; _id?: string; name: string; slug: string } | string;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface InstagramAccount {
  id: string;
  igUserId: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
  accountType: 'BUSINESS' | 'CREATOR';
  pageName?: string;
  connectionStatus: 'connected' | 'disconnected' | 'token_expired' | 'error';
  connectedAt: string;
  lastSyncedAt?: string;
  trackedMediaIds: string[];
  settings?: {
    defaultResponseDelaySeconds: number;
    pauseAutomations: boolean;
    respectMessagingWindow: boolean;
  };
  token?: {
    valid: boolean;
    expiresAt?: string;
    scopes: string[];
    type: string;
    lastRefreshedAt?: string;
  } | null;
}

export type AutomationType =
  | 'KEYWORD_DM'
  | 'COMMENT_DM'
  | 'STORY_REPLY'
  | 'WELCOME_DM'
  | 'FOLLOW_DM'
  | 'WORKFLOW';

export type TriggerType =
  | 'KEYWORD'
  | 'COMMENT'
  | 'STORY_REPLY'
  | 'FOLLOW'
  | 'MESSAGE_RECEIVED'
  | 'MANUAL';

export type KeywordMatchType = 'EXACT' | 'PARTIAL' | 'STARTS_WITH' | 'CONTAINS' | 'REGEX';

export interface AutomationTrigger {
  id?: string;
  type: TriggerType;
  enabled: boolean;
  keywords: string[];
  matchType: KeywordMatchType;
  caseSensitive: boolean;
  mediaIds: string[];
  storyIds: string[];
  delaySeconds: number;
  config?: Record<string, unknown>;
}

export interface AutomationButton {
  type: 'web_url' | 'quick_reply';
  title: string;
  payload?: string;
  url?: string;
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'message' | 'condition' | 'delay' | 'link' | 'lead' | 'action';
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
}

export interface Automation {
  id: string;
  name: string;
  description?: string;
  type: AutomationType;
  isActive: boolean;
  priority: number;
  instagramAccount: string | { id: string; username: string };
  triggers: AutomationTrigger[];
  message?: string;
  fallbackMessage?: string;
  buttons?: AutomationButton[];
  collectLead: boolean;
  leadTags?: string[];
  workflow?: { nodes: WorkflowNode[]; edges: WorkflowEdge[] };
  stats?: {
    triggered: number;
    succeeded: number;
    failed: number;
    leads: number;
    lastTriggeredAt?: string;
  };
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationExecution {
  id: string;
  status: 'success' | 'failed' | 'skipped' | 'queued' | 'running';
  step: string;
  triggerType: string;
  triggerKeyword?: string;
  igUsername?: string;
  messageSent?: string;
  error?: string;
  durationMs?: number;
  automation?: { id: string; name: string; type: AutomationType } | null;
  instagramAccount?: { username: string } | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  igUserId: string;
  igUsername?: string;
  displayName?: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageFrom?: 'inbound' | 'outbound';
  unreadCount: number;
  isAutomated: boolean;
  status: 'open' | 'closed';
  tags: string[];
  messagingWindowExpiresAt?: string;
  instagramAccount?: { id: string; username: string; profilePictureUrl?: string } | null;
}

export interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  status: string;
  sentAt: string;
  error?: string;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'unqualified' | 'lost';
export type LeadSource =
  | 'keyword_dm'
  | 'comment_dm'
  | 'story_reply'
  | 'welcome_dm'
  | 'follow'
  | 'workflow'
  | 'manual'
  | 'link_in_bio';

export interface Lead {
  id: string;
  igUsername: string;
  igUserId?: string;
  name?: string;
  email?: string;
  phone?: string;
  source: LeadSource;
  status: LeadStatus;
  tags: string[];
  notes?: string;
  customFields?: Record<string, unknown>;
  profileSnapshot?: {
    followersCount?: number;
    biography?: string;
    profilePictureUrl?: string;
  };
  instagramAccount?: { id: string; username: string } | null;
  automation?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface LinkInBioLink {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
  clicks: number;
  order: number;
  thumbnailUrl?: string;
}

export interface LinkInBioPage {
  id: string;
  slug: string;
  title: string;
  bio: string;
  avatarUrl?: string;
  theme: {
    template: 'minimal' | 'gradient' | 'cards' | 'glass' | 'sunset';
    backgroundColor: string;
    backgroundImageUrl?: string;
    accentColor: string;
    textColor: string;
    buttonStyle: 'solid' | 'outline' | 'soft' | 'pill';
    showInstagramProfile: boolean;
    fontFamily: string;
  };
  links: LinkInBioLink[];
  socialLinks: Array<{ platform: string; url: string }>;
  seo?: { title?: string; description?: string; imageUrl?: string };
  analytics: { views: number; clicks: number; uniqueVisitors: number };
  isPublished: boolean;
  publishedAt?: string;
  publicUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionPlan = 'free' | 'starter' | 'growth' | 'business';
export type BillingCycle = 'monthly' | 'yearly';

export interface Plan {
  id: SubscriptionPlan;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  instagramAccounts: number;
  activeAutomations: number;
  automationEventsPerMonth: number;
  features: string[];
  entitlements: {
    linkInBio: boolean;
    leadExport: boolean;
    workflowBuilder: boolean;
    advancedAnalytics: boolean;
    teamMembers: boolean;
    prioritySupport: boolean;
    unlimitedAutomations: boolean;
  };
  popular?: boolean;
}

export interface Subscription {
  plan: SubscriptionPlan;
  status: string;
  billingCycle: BillingCycle;
  price: number;
  currency: string;
  planSnapshot: {
    instagramAccounts: number;
    activeAutomations: number;
    automationEventsPerMonth: number;
    features: string[];
  };
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  razorpaySubscriptionId?: string;
}

export interface UsageMetric {
  used: number;
  limit: number | null;
}

export interface UsageSnapshot {
  plan: SubscriptionPlan;
  period: string;
  usagePeriodStart?: string;
  usagePeriodEnd?: string;
  metrics: {
    automationEvents: UsageMetric;
    instagramAccounts: UsageMetric;
    activeAutomations: UsageMetric;
    messagesSent: UsageMetric;
    leadsCreated: UsageMetric;
    linkClicks: UsageMetric;
  };
  entitlements: Plan['entitlements'];
}

export interface Payment {
  id: string;
  plan: string;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  status: string;
  invoiceNumber: string;
  razorpayPaymentId?: string;
  razorpayInvoiceId?: string;
  paidAt?: string;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  readAt?: string;
  createdAt: string;
}

export interface OverviewData {
  cards: {
    instagramAccounts: number;
    activeAutomations: number;
    totalAutomations: number;
    automationEvents: number;
    conversations: number;
    leads: number;
    messages: number;
    linkInBios: number;
    successRate: number;
    failedExecutions: number;
    skippedExecutions: number;
  };
  recentActivity: Array<{
    id: string;
    status: string;
    triggerType: string;
    triggerKeyword?: string;
    igUsername?: string;
    createdAt: string;
    automation?: { id: string; name: string } | null;
    instagramAccount?: { username: string } | null;
  }>;
  usage: UsageSnapshot;
}

export interface DmAnalytics {
  total: number;
  succeeded: number;
  failed: number;
  messages: { inbound: number; outbound: number };
  daily: Array<{ date: string; count: number }>;
  byTrigger: Array<{ type: string; count: number }>;
  topKeywords: Array<{ keyword: string; count: number }>;
}

export interface LeadAnalytics {
  total: number;
  converted: number;
  qualified: number;
  conversionRate: number;
  daily: Array<{ date: string; count: number }>;
  bySource: Array<{ source: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
}
