import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/instaflow_test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_that_is_long_enough_123';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_that_is_long_enough_123';
process.env.ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.RATE_LIMIT_MAX = '100000';
process.env.AUTH_RATE_LIMIT_MAX = '100000';
process.env.ADMIN_EMAIL = 'admin@test.local';
process.env.ADMIN_PASSWORD = 'Admin@12345';
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';

// Fake Razorpay credentials so the *verification* paths are exercised.
// No network call is ever made — every test asserts on a rejected payment.
process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'rzp_test_webhook_secret';
