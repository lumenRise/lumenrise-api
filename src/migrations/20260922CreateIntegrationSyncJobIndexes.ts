import IntegrationSyncJob from '../models/IntegrationSyncJob';
import type { MigrationDefinition } from '../types/database/migration';
const createIntegrationSyncJobIndexes: MigrationDefinition = {
  name: '20260922-create-integration-sync-job-indexes',
  up: async () => {
    await IntegrationSyncJob.createIndexes();
  },
};

export default createIntegrationSyncJobIndexes;
