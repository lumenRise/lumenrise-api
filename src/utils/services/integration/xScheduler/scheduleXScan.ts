import log from '../../../../logger.js';
import schedulerState from './state.js';
import { enqueueDueXSyncs } from './enqueueDueXSyncs.js';

const scheduleXScan = (): void => {
  if (schedulerState.activeScan) {
    return;
  }

  schedulerState.activeScan = enqueueDueXSyncs()
    .then((enqueued) => {
      if (enqueued > 0) {
        log.info({ enqueued }, 'Periodic X synchronization queued');
      }
    })
    .catch((error: unknown) => {
      log.error({ error }, 'Periodic X synchronization scan failed');
    })
    .finally(() => {
      schedulerState.activeScan = null;
    });
};

export { scheduleXScan };
