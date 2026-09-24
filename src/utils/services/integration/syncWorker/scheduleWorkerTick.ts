import workerState from './state.js';
import log from '../../../../logger.js';
import { runIntegrationSyncWorkerTick } from './runIntegrationSyncWorkerTick.js';

const scheduleWorkerTick = (): void => {
  if (workerState.activeTick) {
    return;
  }

  workerState.activeTick = runIntegrationSyncWorkerTick()
    .catch((error: unknown) => {
      log.error({ error }, 'Integration synchronization worker tick failed');
    })
    .finally(() => {
      workerState.activeTick = null;
    });
};

export { scheduleWorkerTick };
