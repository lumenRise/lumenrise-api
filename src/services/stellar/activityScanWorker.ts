import workerState from '../../utils/services/stellar/activityScanWorker/state.js';
import { processStellarActivityScan } from '../../utils/services/stellar/activityScanWorker/processStellarActivityScan.js';
import { startStellarActivityScanWorker } from '../../utils/services/stellar/activityScanWorker/startStellarActivityScanWorker.js';

const stopStellarActivityScanWorker = async (): Promise<void> => {
  if (workerState.workerTimer) {
    clearInterval(workerState.workerTimer);
    workerState.workerTimer = null;
  }

  await workerState.activeTick;
};

export {
  processStellarActivityScan,
  startStellarActivityScanWorker,
  stopStellarActivityScanWorker,
};
