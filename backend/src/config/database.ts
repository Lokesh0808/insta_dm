import mongoose from 'mongoose';

export const connectDatabase = async (uri: string): Promise<typeof mongoose> => {
  // NOTE: `sanitizeFilter` is intentionally NOT enabled globally — it rewrites
  // legitimate range operators (e.g. `{ createdAt: { $gte, $lte } }`) into
  // `$eq` and breaks them. User-supplied filters are protected instead by the
  // `mongoSanitize` middleware (rejects `$` operators) and by escaping every
  // user-provided regex pattern with `escapeRegex`.
  mongoose.set('strictQuery', true);

  const conn = await mongoose.connect(uri, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    autoIndex: process.env.NODE_ENV !== 'production',
  });

  conn.connection.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[mongodb] connection error', err.message);
  });
  conn.connection.on('disconnected', () => {
    // eslint-disable-next-line no-console
    console.warn('[mongodb] disconnected');
  });

  return conn;
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
};
