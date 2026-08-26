import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs/promises';

export async function connectDatabase() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shortifyai';
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log('MongoDB connected');
  } catch (error) {
    if (error.name === 'MongooseServerSelectionError' || error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      console.warn('Local MongoDB 127.0.0.1:27017 connection refused. Initializing persistent local Mongo database on disk...');
      const storageDbPath = path.resolve('.data/mongodb');
      await fs.mkdir(storageDbPath, { recursive: true });

      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create({
        instance: {
          dbName: 'shortifyai',
          dbPath: storageDbPath,
          storageEngine: 'wiredTiger'
        }
      });
      const memoryUri = mongod.getUri();
      await mongoose.connect(memoryUri);
      console.log(`Persistent local MongoDB connected at ${memoryUri} with disk storage at ${storageDbPath}`);
      return;
    }

    throw error;
  }
}

