import mongoose from 'mongoose';

import { connectDatabase } from './utils/db/connectDatabase.js';
import { disconnectDatabase } from './utils/db/disconnectDatabase.js';
import type { DatabaseTransaction } from './types/database/migration.js';

const withDatabaseTransaction = async <T>(operation: DatabaseTransaction<T>): Promise<T> => {
  return mongoose.connection.transaction(operation);
};

export { connectDatabase, disconnectDatabase, withDatabaseTransaction };
