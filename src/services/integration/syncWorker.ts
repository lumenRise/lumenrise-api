import workerState from '../../utils/services/integration/syncWorker/state.js';
import { processIntegrationSyncJob } from '../../utils/services/integration/syncWorker/processIntegrationSyncJob.js';
import { startIntegrationSyncWorker } from '../../utils/services/integration/syncWorker/startIntegrationSyncWorker.js';

const stopIntegrationSyncWorker = async (): Promise<void> => {
  if (workerState.workerTimer) {
    clearInterval(workerState.workerTimer);
    workerState.workerTimer = null;
  }

  await workerState.activeTick;
};

export { processIntegrationSyncJob, startIntegrationSyncWorker, stopIntegrationSyncWorker };
