import ReputationCleanupJob from '../models/ReputationCleanupJob';
import type { MigrationDefinition } from '../types/database/migration';

const reputationCleanupJobs: MigrationDefinition = {
  name: '20261105-reputation-cleanup-jobs',
  up: async (): Promise<void> => {
    await ReputationCleanupJob.createIndexes();
  },
};

export default reputationCleanupJobs;
