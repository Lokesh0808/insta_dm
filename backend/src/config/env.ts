import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === 'boolean' ? v : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase())));

const csv = z
  .union([z.string(), z.array(z.string())])
  .transform((v): string =>
    Array.isArray(v) ? v.join(',') : v.split(',').map((s) => s.trim()).filter(Boolean).join(','),
  );

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default('info'),
  APP_NAME: z.string().default('Instaflow'),

  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().default('http://localhost:4000/api'),
  INTERNAL_CLIENT_URL: z.string().default('http://localhost:5173'),
  APP_BASE_URL: z.string().default('http://localhost:5173'),

  MONGODB_URI: z.string().min(3).default('mongodb://127.0.0.1:27017/instaflow'),
  MONGO_DB_NAME: z.string().default('instaflow'),

  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  REDIS_DB: z.coerce.number().int().default(0),

  JWT_ACCESS_SECRET: z.string().min(16).default('dev_access_secret_change_me_please'),
  JWT_REFRESH_SECRET: z.string().min(16).default('dev_refresh_secret_change_me_please'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
    .default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),

  COOKIE_SECURE: booleanish.default(false),
  CORS_ORIGINS: csv.default('http://localhost:5173,http://localhost:4000,http://localhost'),

  META_APP_ID: z.string().default(''),
  META_APP_SECRET: z.string().default(''),
  META_GRAPH_VERSION: z.string().default('v21.0'),
  META_REDIRECT_URI: z.string().default('http://localhost:4000/api/instagram/callback'),
  META_WEBHOOK_VERIFY_TOKEN: z.string().default('instaflow_webhook_verify_token'),
  META_APP_MODE: z.enum(['development', 'live']).default('development'),
  META_SCOPES: csv.default(
    'instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_show_list,pages_read_engagement,instagram_manage_insights',
  ),

  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(''),
  RAZORPAY_PLAN_STARTER_MONTHLY: z.string().default(''),
  RAZORPAY_PLAN_STARTER_YEARLY: z.string().default(''),
  RAZORPAY_PLAN_GROWTH_MONTHLY: z.string().default(''),
  RAZORPAY_PLAN_GROWTH_YEARLY: z.string().default(''),
  RAZORPAY_PLAN_BUSINESS_MONTHLY: z.string().default(''),
  RAZORPAY_PLAN_BUSINESS_YEARLY: z.string().default(''),

  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: booleanish.default(false),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  EMAIL_FROM: z.string().default('Instaflow <no-reply@instaflow.com>'),

  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:4000/api/auth/google/callback'),

  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().default(''),
  AWS_SECRET_ACCESS_KEY: z.string().default(''),
  AWS_S3_BUCKET: z.string().default('instaflow-assets'),
  AWS_S3_PUBLIC_URL: z.string().default(''),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  LOCAL_STORAGE_PATH: z.string().default('./uploads'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().default(1000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().default(20),
  WEBHOOK_RATE_LIMIT_MAX: z.coerce.number().int().default(3000),

  LINK_DOMAIN_BASE: z.string().default('localhost:5173'),
  CUSTOM_DOMAIN_ENABLED: booleanish.default(false),

  ADMIN_PANEL_ENABLED: booleanish.default(true),
  ADMIN_EMAIL: z.string().default('admin@instaflow.local'),
  ADMIN_PASSWORD: z.string().default('Admin@12345'),
  ADMIN_NAME: z.string().default('Platform Admin'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(`\n[instaflow] Invalid environment configuration:\n${issues}\n`);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

export const env = parsed.success ? parsed.data : envSchema.parse(process.env);

export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const isDev = env.NODE_ENV === 'development';

/** Origins that are explicitly allowed to call the API from a browser. */
export const corsOrigins: string[] = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const metaConfig = {
  appId: env.META_APP_ID,
  appSecret: env.META_APP_SECRET,
  graphVersion: env.META_GRAPH_VERSION,
  redirectUri: env.META_REDIRECT_URI,
  verifyToken: env.META_WEBHOOK_VERIFY_TOKEN,
  mode: env.META_APP_MODE,
  scopes: env.META_SCOPES.split(',').filter(Boolean),
  graphBaseUrl: `https://graph.facebook.com/${env.META_GRAPH_VERSION}`,
  oauthDialogUrl: `https://www.facebook.com/${env.META_GRAPH_VERSION}/dialog/oauth`,
  get configured() {
    return Boolean(env.META_APP_ID && env.META_APP_SECRET);
  },
};

export const razorpayConfig = {
  keyId: env.RAZORPAY_KEY_ID,
  keySecret: env.RAZORPAY_KEY_SECRET,
  webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
  get configured() {
    return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
  },
};

export const googleConfig = {
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  callbackUrl: env.GOOGLE_CALLBACK_URL,
  get configured() {
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  },
};
