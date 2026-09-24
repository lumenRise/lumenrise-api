import env from '../../../../env.js';
import workerState from './state.js';
import { scheduleWorkerTick } from './scheduleWorkerTick.js';

const startStellarActivityScanWorker = (): void => {
  if (workerState.workerTimer) {
    return;
  }

  scheduleWorkerTick();
  workerState.workerTimer = setInterval(scheduleWorkerTick, env.SYNC_WORKER_POLL_INTERVAL_MS);
  workerState.workerTimer.unref();
};

export { startStellarActivityScanWorker };
