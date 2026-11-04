import StellarTransactionJob from '../models/StellarTransactionJob';
import type { MigrationDefinition } from '../types/database/migration';

const stellarTransactionJobs: MigrationDefinition = {
  name: '20261105-stellar-transaction-jobs',
  up: async (): Promise<void> => {
    await StellarTransactionJob.createIndexes();
  },
};

export default stellarTransactionJobs;
