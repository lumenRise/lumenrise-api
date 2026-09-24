import { processStellarActivityScan } from './processStellarActivityScan.js';
import { claimStellarActivityScan } from '../../../../services/stellar/activityScanQueue.js';

const runStellarActivityScanWorkerTick = async (): Promise<void> => {
  const scan = await claimStellarActivityScan();

  if (scan) {
    await processStellarActivityScan(scan);
  }
};

export { runStellarActivityScanWorkerTick };
