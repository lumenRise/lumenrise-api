import env from '../../env.js';
import log from '../../logger.js';
import { mergeStellarActivityPage } from './mergeActivityPage.js';
import getStellarAccountOperations from './getAccountOperations.js';
import StellarActivityScan from '../../models/StellarActivityScan.js';
import type { StellarActivityScanDocument } from '../../types/stellar/scan.js';
import { claimStellarActivityScan, failStellarActivityScan } from './activityScanQueue.js';

let workerTimer: NodeJS.Timeout | null = null;
let activeTick: Promise<void> | null = null;

const processStellarActivityScan = async (scan: StellarActivityScanDocument): Promise<void> => {
  try {
    const page = await getStellarAccountOperations(
      scan.address,
      scan.cursor,
      200,
      'desc',
      scan.sourceUrl,
    );

    if (!page) {
      await failStellarActivityScan(scan, 'Stellar account was not found', false);
      return;
    }

    const merged = mergeStellarActivityPage(
      scan.summary,
      page,
      scan.lastDay,
      scan.lastTransactionHash,
    );

    const completed = page.nextCursor === null;
    const now = new Date();

    await StellarActivityScan.updateOne(
      { _id: scan._id, status: 'running', leaseUntil: scan.leaseUntil, cursor: scan.cursor },
      {
        $set: {
          status: completed ? 'completed' : 'queued',
          active: !completed,
          cursor: page.nextCursor ?? scan.cursor,
          summary: merged.summary,
          lastDay: merged.lastDay,
          lastTransactionHash: merged.lastTransactionHash,
          pagesProcessed: scan.pagesProcessed + 1,
          consecutiveFailures: 0,
          scheduledAt: now,
          leaseUntil: null,
          completedAt: completed ? now : null,
          lastProcessedAt: now,
          lastError: null,
        },
      },
      { runValidators: true },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Stellar scan error';

    await failStellarActivityScan(scan, message, true);
    log.warn({ error, scanId: scan._id }, 'Stellar activity scan page failed');
  }
};

const runStellarActivityScanWorkerTick = async (): Promise<void> => {
  const scan = await claimStellarActivityScan();

  if (scan) {
    await processStellarActivityScan(scan);
  }
};

const scheduleWorkerTick = (): void => {
  if (activeTick) {
    return;
  }

  activeTick = runStellarActivityScanWorkerTick()
    .catch((error: unknown) => {
      log.error({ error }, 'Stellar activity scan worker tick failed');
    })
    .finally(() => {
      activeTick = null;
    });
};

const startStellarActivityScanWorker = (): void => {
  if (workerTimer) {
    return;
  }

  scheduleWorkerTick();
  workerTimer = setInterval(scheduleWorkerTick, env.SYNC_WORKER_POLL_INTERVAL_MS);
  workerTimer.unref();
};

const stopStellarActivityScanWorker = async (): Promise<void> => {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }

  await activeTick;
};

export {
  processStellarActivityScan,
  startStellarActivityScanWorker,
  stopStellarActivityScanWorker,
};
