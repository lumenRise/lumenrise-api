import { processIntegrationSyncJob } from './processIntegrationSyncJob.js';
import { claimIntegrationSyncJob } from '../../../../services/integration/syncQueue.js';

const runIntegrationSyncWorkerTick = async (): Promise<void> => {
  const job = await claimIntegrationSyncJob();

  if (!job) {
    return;
  }

  await processIntegrationSyncJob(job);
};

export { runIntegrationSyncWorkerTick };
