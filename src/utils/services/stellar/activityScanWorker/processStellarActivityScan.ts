import log from '../../../../logger.js';
import type { StellarActivityScanDocument } from '../../../../types/stellar/scan.js';
import { failStellarActivityScan } from '../../../../services/stellar/activityScanQueue.js';
import { mergeStellarActivityPage } from '../../../../services/stellar/mergeActivityPage.js';
import getStellarAccountOperations from '../../../../services/stellar/getAccountOperations.js';
import persistStellarPaymentPage from '../../../../services/sybil/persistStellarPaymentPage.js';

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

    const now = new Date();

    await persistStellarPaymentPage(scan, page, merged, now);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Stellar scan error';

    await failStellarActivityScan(scan, message, true);
    log.warn({ error, scanId: scan._id }, 'Stellar activity scan page failed');
  }
};

export { processStellarActivityScan };
