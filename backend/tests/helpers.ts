import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer | undefined;

export const startTestDatabase = async (): Promise<string> => {
  mongoServer = await MongoMemoryServer.create({
    binary: { version: '7.0.14' },
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  return uri;
};

export const stopTestDatabase = async (): Promise<void> => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer?.stop();
};

export const clearDatabase = async (): Promise<void> => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
};
