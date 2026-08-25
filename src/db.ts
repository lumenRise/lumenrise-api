import mongoose from 'mongoose';

import env from './env.js';
import log from './logger.js';
import type { DatabaseTransaction } from './types/database/migration.js';

const connectDatabase = async (): Promise<void> => {
  mongoose.set('autoIndex', env.NODE_ENV !== 'production');
  await mongoose.connect(env.DB_URI, { dbName: env.DB_NAME });
  log.info({ database: env.DB_NAME }, 'Database connected');
};
const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  log.info('Database disconnected');
};
const withDatabaseTransaction = async <T>(operation: DatabaseTransaction<T>): Promise<T> => {
  return mongoose.connection.transaction(operation);
};

export { connectDatabase, disconnectDatabase, withDatabaseTransaction };
