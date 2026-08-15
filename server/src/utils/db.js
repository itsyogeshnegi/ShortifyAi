import mongoose from 'mongoose';

export async function connectDatabase() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shortifyai';
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log('MongoDB connected');
  } catch (error) {
    if (error.name === 'MongooseServerSelectionError' || error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      console.warn('Local MongoDB 127.0.0.1:27017 connection refused. Initializing in-memory Mongo server...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create({
        instance: { dbName: 'shortifyai' }
      });
      const memoryUri = mongod.getUri();
      await mongoose.connect(memoryUri);
      console.log(`In-Memory MongoDB connected at ${memoryUri}`);
      return;
    }

    throw error;
  }
}

