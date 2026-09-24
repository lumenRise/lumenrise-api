import schedulerState from './state.js';
import { scheduleXScan } from './scheduleXScan.js';
import { X_SYNC_SCAN_INTERVAL_MS } from '../../../../constants/services/integration/xScheduler.js';

const startXScheduler = (): void => {
  if (schedulerState.schedulerTimer) {
    return;
  }

  scheduleXScan();
  schedulerState.schedulerTimer = setInterval(scheduleXScan, X_SYNC_SCAN_INTERVAL_MS);
  schedulerState.schedulerTimer.unref();
};

export { startXScheduler };
