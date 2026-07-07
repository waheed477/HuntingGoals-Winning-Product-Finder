import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod = null;

export async function connectMemoryDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!mongod) {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    await mongoose.connect(uri, {
      dbName: 'trendspy',
    });

    console.log('✅ In-memory MongoDB connected');
    console.log('URI:', uri);
  }

  return mongoose.connection;
}

export async function disconnectMemoryDB() {
  if (mongod) {
    await mongoose.disconnect();
    await mongod.stop();
    mongod = null;
    console.log('✅ In-memory MongoDB disconnected');
  }
}
