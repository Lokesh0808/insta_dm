import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { BadRequestError } from '../utils/errors';

let s3Client: S3Client | null = null;

const getS3 = (): S3Client => {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials:
        env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
          ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY }
          : undefined,
    });
  }
  return s3Client;
};

export interface StoredFile {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_SIZE = 5 * 1024 * 1024;

const buildKey = (folder: string, originalName: string): string => {
  const ext = path.extname(originalName).toLowerCase() || '.bin';
  const safeName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 40);
  return `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${safeName}${ext}`;
};

/**
 * Uploads a file either to S3 (production) or to the local uploads volume (dev).
 */
export const uploadFile = async (
  file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  folder = 'uploads',
): Promise<StoredFile> => {
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    throw new BadRequestError(`Unsupported file type: ${file.mimetype}`);
  }
  if (file.size > MAX_SIZE) {
    throw new BadRequestError('File exceeds the 5MB limit');
  }

  const key = buildKey(folder, file.originalname);

  if (env.STORAGE_DRIVER === 's3') {
    await getS3().send(
      new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      }),
    );
    const base = env.AWS_S3_PUBLIC_URL || `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com`;
    return { key, url: `${base}/${key}`, size: file.size, contentType: file.mimetype };
  }

  const targetDir = path.resolve(env.LOCAL_STORAGE_PATH, folder);
  await fs.promises.mkdir(targetDir, { recursive: true });
  const target = path.join(targetDir, path.basename(key));
  await fs.promises.writeFile(target, file.buffer);
  logger.debug({ key, size: file.size }, 'file stored locally');

  return {
    key,
    url: `/uploads/${folder}/${path.basename(key)}`,
    size: file.size,
    contentType: file.mimetype,
  };
};

export const deleteFile = async (key: string): Promise<void> => {
  if (env.STORAGE_DRIVER === 's3') {
    await getS3().send(new DeleteObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key }));
    return;
  }
  const target = path.resolve(env.LOCAL_STORAGE_PATH, key);
  if (!target.startsWith(path.resolve(env.LOCAL_STORAGE_PATH))) {
    throw new BadRequestError('Invalid file key');
  }
  await fs.promises.unlink(target).catch(() => undefined);
};
