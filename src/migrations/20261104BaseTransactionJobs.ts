import BaseTransactionJob from '../models/BaseTransactionJob';
import type { MigrationDefinition } from '../types/database/migration';

const baseTransactionJobs: MigrationDefinition = {
  name: '20261104-base-transaction-jobs',
  up: async (): Promise<void> => {
    await BaseTransactionJob.createIndexes();
  },
};

export default baseTransactionJobs;
