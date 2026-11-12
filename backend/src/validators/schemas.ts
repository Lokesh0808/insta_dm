import { z } from 'zod';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().trim().email('Enter a valid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/\d/, 'Password must contain a number'),
  workspaceName: z.string().trim().min(2).max(120).optional(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) }).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/\d/),
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(32).optional(),
  avatarUrl: z.string().url().optional(),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
      timezone: z.string().max(64).optional(),
      notifications: z
        .object({
          email: z.boolean().optional(),
          inApp: z.boolean().optional(),
          leadAlerts: z.boolean().optional(),
          usageAlerts: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/\d/),
});

const triggerSchema = z.object({
  type: z.enum(['KEYWORD', 'COMMENT', 'STORY_REPLY', 'FOLLOW', 'MESSAGE_RECEIVED']),
  enabled: z.boolean().default(true),
  keywords: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
  matchType: z.enum(['EXACT', 'PARTIAL', 'STARTS_WITH', 'CONTAINS', 'REGEX']).default('PARTIAL'),
  caseSensitive: z.boolean().default(false),
  mediaIds: z.array(z.string().trim()).max(200).default([]),
  storyIds: z.array(z.string().trim()).max(200).default([]),
  delaySeconds: z.number().int().min(0).max(86400).default(0),
  config: z.record(z.unknown()).default({}),
});

export const createAutomationSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(160),
  description: z.string().trim().max(1000).optional(),
  type: z.enum([
    'KEYWORD_DM',
    'COMMENT_DM',
    'STORY_REPLY',
    'WELCOME_DM',
    'FOLLOW_DM',
    'WORKFLOW',
  ]),
  instagramAccountId: objectId,
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).max(1000).default(0),
  triggers: z.array(triggerSchema).max(20).default([]),
  message: z.string().trim().max(2000).optional(),
  fallbackMessage: z.string().trim().max(2000).optional(),
  collectLead: z.boolean().default(false),
  leadTags: z.array(z.string().trim().max(40)).max(20).default([]),
  buttons: z
    .array(
      z.object({
        type: z.enum(['web_url', 'quick_reply']),
        title: z.string().trim().min(1).max(20),
        payload: z.string().trim().max(120).optional(),
        url: z.string().url().optional(),
      }),
    )
    .max(3)
    .default([]),
  workflow: z
    .object({
      nodes: z.array(z.record(z.unknown())).max(100),
      edges: z.array(z.record(z.unknown())).max(200),
    })
    .optional(),
});

export const updateAutomationSchema = createAutomationSchema.partial().extend({
  _id: z.undefined().optional(),
});

export const toggleAutomationSchema = z.object({
  isActive: z.boolean(),
});

export const listAutomationsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  type: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  instagramAccountId: objectId.optional(),
  search: z.string().optional(),
  sort: z.enum(['createdAt', '-createdAt', 'priority', '-priority', 'name']).optional(),
});

export const createLeadSchema = z.object({
  igUsername: z.string().trim().min(1).max(64).toLowerCase(),
  igUserId: z.string().trim().max(64).optional(),
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  phone: z.string().trim().max(32).optional(),
  instagramAccountId: objectId,
  source: z
    .enum([
      'keyword_dm',
      'comment_dm',
      'story_reply',
      'welcome_dm',
      'follow',
      'workflow',
      'manual',
      'link_in_bio',
    ])
    .default('manual'),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'unqualified', 'lost']).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  notes: z.string().trim().max(5000).optional(),
  customFields: z.record(z.unknown()).default({}),
});

export const updateLeadSchema = createLeadSchema.partial().omit({ instagramAccountId: true });

export const listLeadsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  tag: z.string().optional(),
  instagramAccountId: objectId.optional(),
  sort: z.enum(['createdAt', '-createdAt', 'name']).optional(),
});

export const listConversationsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  search: z.string().optional(),
  unread: z.enum(['true', 'false']).optional(),
  instagramAccountId: objectId.optional(),
});

export const createOrderSchema = z.object({
  plan: z.enum(['free', 'starter', 'growth', 'business']),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(4),
  razorpayPaymentId: z.string().min(4),
  razorpaySignature: z.string().min(16),
  plan: z.enum(['starter', 'growth', 'business']),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
});

export const linkInBioSchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(3).max(40).regex(/^[a-z0-9-]+$/i).optional(),
  bio: z.string().trim().max(1000).optional(),
  avatarUrl: z.string().url().optional(),
  instagramAccountId: objectId.optional(),
  theme: z
    .object({
      template: z.enum(['minimal', 'gradient', 'cards', 'glass', 'sunset']).optional(),
      backgroundColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
      backgroundImageUrl: z.string().url().optional(),
      accentColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
      textColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
      buttonStyle: z.enum(['solid', 'outline', 'soft', 'pill']).optional(),
      showInstagramProfile: z.boolean().optional(),
      fontFamily: z.string().max(64).optional(),
    })
    .optional(),
  links: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().trim().min(1).max(120),
        url: z.string().url(),
        isActive: z.boolean().default(true),
        order: z.number().int().default(0),
        thumbnailUrl: z.string().url().optional(),
      }),
    )
    .max(30)
    .optional(),
  socialLinks: z
    .array(
      z.object({
        platform: z.string().trim().min(1).max(40),
        url: z.string().url(),
      }),
    )
    .max(10)
    .optional(),
  seo: z
    .object({
      title: z.string().max(160).optional(),
      description: z.string().max(300).optional(),
      imageUrl: z.string().url().optional(),
    })
    .optional(),
  isPublished: z.boolean().optional(),
});

export const adminUserUpdateSchema = z.object({
  isSuspended: z.boolean().optional(),
  suspendedReason: z.string().max(500).optional(),
  platformRole: z.enum(['user', 'admin', 'superadmin']).optional(),
  plan: z.enum(['free', 'starter', 'growth', 'business']).optional(),
  status: z.enum(['active', 'trialing', 'past_due', 'paused', 'cancelled', 'expired']).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
});
