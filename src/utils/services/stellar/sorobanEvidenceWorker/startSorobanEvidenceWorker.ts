import env from '../../../../env.js';
import workerState from './state.js';
import { scheduleSorobanEvidenceTick } from './scheduleSorobanEvidenceTick.js';

const startSorobanEvidenceWorker = (): void => {
  if (workerState.timer) {
    return;
  }

  scheduleSorobanEvidenceTick();
  workerState.timer = setInterval(scheduleSorobanEvidenceTick, env.SYNC_WORKER_POLL_INTERVAL_MS);
  workerState.timer.unref();
};

export { startSorobanEvidenceWorker };
