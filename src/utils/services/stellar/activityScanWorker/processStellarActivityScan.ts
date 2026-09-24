import log from '../../../../logger.js';
import StellarActivityScan from '../../../../models/StellarActivityScan.js';
import type { StellarActivityScanDocument } from '../../../../types/stellar/scan.js';
import { failStellarActivityScan } from '../../../../services/stellar/activityScanQueue.js';
import { mergeStellarActivityPage } from '../../../../services/stellar/mergeActivityPage.js';
import getStellarAccountOperations from '../../../../services/stellar/getAccountOperations.js';

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

export { processStellarActivityScan };
