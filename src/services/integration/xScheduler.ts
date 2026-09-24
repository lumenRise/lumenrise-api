import schedulerState from '../../utils/services/integration/xScheduler/state.js';
import { X_SYNC_SCAN_INTERVAL_MS } from '../../constants/services/integration/xScheduler.js';
import { startXScheduler } from '../../utils/services/integration/xScheduler/startXScheduler.js';
import { enqueueDueXSyncs } from '../../utils/services/integration/xScheduler/enqueueDueXSyncs.js';

const stopXScheduler = async (): Promise<void> => {
  if (schedulerState.schedulerTimer) {
    clearInterval(schedulerState.schedulerTimer);
    schedulerState.schedulerTimer = null;
  }

  await schedulerState.activeScan;
};

export { enqueueDueXSyncs, startXScheduler, stopXScheduler };

export { X_SYNC_SCAN_INTERVAL_MS };
