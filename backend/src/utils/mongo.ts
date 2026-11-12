import mongoose from 'mongoose';

/** Re-exported so controllers can share the same Mongoose instance. */
export { mongoose };
export const isValidObjectId = (value: unknown): boolean =>
  mongoose.Types.ObjectId.isValid(String(value));
