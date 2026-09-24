import type { StellarActivityScanDocument } from '../../types/stellar/scan.js';
import type { StellarReputationResult } from '../../types/reputation/stellar.js';
import { calculateStellarActivityScore } from '../../services/stellar/activityScore.js';
import { toStellarActivityScanResult } from '../../services/stellar/activityScanQueue.js';

const toStellarReputationResult = (
  address: string,
  scan: StellarActivityScanDocument | null,
): StellarReputationResult => ({
  address,
  ownershipVerified: true,
  scanStatus: scan?.status ?? 'not_started',
  scan: scan ? { ...toStellarActivityScanResult(scan), ownershipVerified: true } : null,
  score:
    scan?.status === 'completed'
      ? { ...calculateStellarActivityScore(scan), ownershipVerified: true }
      : null,
});

export default toStellarReputationResult;
