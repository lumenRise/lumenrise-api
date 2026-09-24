import workerState from './state.js';
import log from '../../../../logger.js';
import { runStellarActivityScanWorkerTick } from './runStellarActivityScanWorkerTick.js';

const scheduleWorkerTick = (): void => {
  if (workerState.activeTick) {
    return;
  }

  workerState.activeTick = runStellarActivityScanWorkerTick()
    .catch((error: unknown) => {
      log.error({ error }, 'Stellar activity scan worker tick failed');
    })
    .finally(() => {
      workerState.activeTick = null;
    });
};

export { scheduleWorkerTick };
