import crypto from 'crypto';
import { env } from '../config/env';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  return Buffer.from(env.ENCRYPTION_KEY, 'hex');
}

/**
 * Encrypt a secret for storage at rest (AES-256-GCM).
 * Output format: `v1:<iv>:<authTag>:<cipherText>` (all base64url).
 */
export function encrypt(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `v1:${iv.toString('base64url')}:${authTag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

/**
 * Decrypt a value produced by {@link encrypt}. Supports legacy plaintext values
 * (returned as-is) so a partially migrated database never breaks the API.
 */
export function decrypt(cipherText: string): string {
  if (!cipherText) return '';
  if (!cipherText.startsWith('v1:')) return cipherText;

  const [, ivB64, tagB64, dataB64] = cipherText.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Malformed encrypted payload');
  }
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

/** Deterministic hash used for webhook signature validation. */
export function hmacSha256(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

/** Constant-time string comparison that tolerates undefined inputs. */
export function safeCompare(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
