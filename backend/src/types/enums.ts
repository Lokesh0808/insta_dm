/**
 * Shared domain enums / constant tables used across models, services and jobs.
 */

export const USER_ROLES = ['owner', 'admin', 'member', 'viewer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PLATFORM_ROLES = ['user', 'admin', 'superadmin'] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const INSTAGRAM_ACCOUNT_TYPES = ['BUSINESS', 'CREATOR'] as const;
export type InstagramAccountType = (typeof INSTAGRAM_ACCOUNT_TYPES)[number];

export const INSTAGRAM_CONNECTION_STATUS = [
  'connected',
  'disconnected',
  'token_expired',
  'error',
] as const;
export type InstagramConnectionStatus = (typeof INSTAGRAM_CONNECTION_STATUS)[number];

export const AUTOMATION_TYPES = [
  'KEYWORD_DM',
  'COMMENT_DM',
  'STORY_REPLY',
  'WELCOME_DM',
  'FOLLOW_DM',
  'WORKFLOW',
] as const;
export type AutomationType = (typeof AUTOMATION_TYPES)[number];

export const TRIGGER_TYPES = [
  'KEYWORD',
  'COMMENT',
  'STORY_REPLY',
  'FOLLOW',
  'MESSAGE_RECEIVED',
  'MANUAL',
] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const KEYWORD_MATCH_TYPES = ['EXACT', 'PARTIAL', 'STARTS_WITH', 'CONTAINS', 'REGEX'] as const;
export type KeywordMatchType = (typeof KEYWORD_MATCH_TYPES)[number];

export const EXECUTION_STATUS = ['success', 'failed', 'skipped', 'queued', 'running'] as const;
export type ExecutionStatus = (typeof EXECUTION_STATUS)[number];

export const MESSAGE_DIRECTION = ['inbound', 'outbound'] as const;
export type MessageDirection = (typeof MESSAGE_DIRECTION)[number];

export const MESSAGE_STATUS = ['sent', 'delivered', 'read', 'failed', 'received'] as const;
export type MessageStatus = (typeof MESSAGE_STATUS)[number];

export const LEAD_STATUS = ['new', 'contacted', 'qualified', 'converted', 'unqualified', 'lost'] as const;
export type LeadStatus = (typeof LEAD_STATUS)[number];

export const LEAD_SOURCE = [
  'keyword_dm',
  'comment_dm',
  'story_reply',
  'welcome_dm',
  'follow',
  'workflow',
  'manual',
  'link_in_bio',
] as const;
export type LeadSource = (typeof LEAD_SOURCE)[number];

export const SUBSCRIPTION_PLANS = ['free', 'starter', 'growth', 'business'] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const SUBSCRIPTION_STATUS = [
  'active',
  'trialing',
  'past_due',
  'paused',
  'cancelled',
  'expired',
  'unpaid',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[number];

export const BILLING_CYCLE = ['monthly', 'yearly'] as const;
export type BillingCycle = (typeof BILLING_CYCLE)[number];

export const PAYMENT_STATUS = [
  'created',
  'authorized',
  'captured',
  'failed',
  'refunded',
  'disputed',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

export const WEBHOOK_STATUS = ['received', 'processed', 'failed', 'ignored', 'duplicate'] as const;
export type WebhookStatus = (typeof WEBHOOK_STATUS)[number];

export const NODE_TYPES = [
  'trigger',
  'message',
  'condition',
  'delay',
  'link',
  'lead',
  'action',
] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const USAGE_METRICS = [
  'automation_events',
  'instagram_accounts',
  'active_automations',
  'messages_sent',
  'leads_created',
  'link_clicks',
] as const;
export type UsageMetric = (typeof USAGE_METRICS)[number];

export const NOTIFICATION_TYPE = [
  'subscription',
  'usage_limit',
  'automation',
  'lead',
  'system',
  'billing',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPE)[number];
