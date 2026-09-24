import type {
  StellarActivityScanDocument,
  StellarActivityScanResult,
} from '../../../../types/stellar/scan.js';

const toStellarActivityScanResult = (
  scan: StellarActivityScanDocument,
): StellarActivityScanResult => ({
  id: scan._id.toString(),
  address: scan.address,
  ownershipVerified: false,
  source: 'horizon',
  status: scan.status,
  availableHistoryScanned: scan.status === 'completed',
  cursor: scan.cursor,
  pagesProcessed: scan.pagesProcessed,
  summary: scan.summary,
  lastProcessedAt: scan.lastProcessedAt?.toISOString() ?? null,
  completedAt: scan.completedAt?.toISOString() ?? null,
  lastError: scan.lastError,
});

export { toStellarActivityScanResult };
