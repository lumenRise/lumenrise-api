import mongoose from 'mongoose';

import { connectDatabase } from './utils/db/connectDatabase';
import { disconnectDatabase } from './utils/db/disconnectDatabase';
import type { DatabaseTransaction } from './types/database/migration';
const withDatabaseTransaction = async <T>(operation: DatabaseTransaction<T>): Promise<T> => {
  return mongoose.connection.transaction(operation);
};

export { connectDatabase, disconnectDatabase, withDatabaseTransaction };
