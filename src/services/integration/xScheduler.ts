import env from '../../env.js';
import log from '../../logger.js';
import { enqueueXSync } from './syncQueue.js';
import ExternalAccount from '../../models/ExternalAccount.js';
import IntegrationSyncJob from '../../models/IntegrationSyncJob.js';

const X_SYNC_SCAN_INTERVAL_MS = 300_000;

let schedulerTimer: NodeJS.Timeout | null = null;
let activeScan: Promise<void> | null = null;

const enqueueDueXSyncs = async (now = new Date()): Promise<number> => {
  if (env.X_AUTO_SYNC_INTERVAL_HOURS <= 0) {
    return 0;
  }

  const dueBefore = new Date(now.getTime() - env.X_AUTO_SYNC_INTERVAL_HOURS * 3_600_000);

  const accounts = ExternalAccount.find({
    provider: 'x',
    status: 'connected',
    $or: [{ lastSyncedAt: null }, { lastSyncedAt: { $lte: dueBefore } }],
  }).cursor();

  let enqueued = 0;

  for await (const account of accounts) {
    const latestJob = await IntegrationSyncJob.findOne({
      externalAccount: account._id,
      provider: 'x',
    }).sort({ createdAt: -1 });

    if (latestJob?.active || (latestJob && latestJob.createdAt > dueBefore)) {
      continue;
    }

    await enqueueXSync(account, now);
    enqueued += 1;
  }

  return enqueued;
};

const scheduleXScan = (): void => {
  if (activeScan) {
    return;
  }

  activeScan = enqueueDueXSyncs()
    .then((enqueued) => {
      if (enqueued > 0) {
        log.info({ enqueued }, 'Periodic X synchronization queued');
      }
    })
    .catch((error: unknown) => {
      log.error({ error }, 'Periodic X synchronization scan failed');
    })
    .finally(() => {
      activeScan = null;
    });
};

const startXScheduler = (): void => {
  if (schedulerTimer) {
    return;
  }

  scheduleXScan();
  schedulerTimer = setInterval(scheduleXScan, X_SYNC_SCAN_INTERVAL_MS);
  schedulerTimer.unref();
};
const stopXScheduler = async (): Promise<void> => {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }

  await activeScan;
};

export { enqueueDueXSyncs, startXScheduler, stopXScheduler };
