import type { StellarActivityScanDocument } from '../../types/stellar/scan';
import type { StellarReputationResult } from '../../types/reputation/stellar';
import { calculateStellarActivityScore } from '../../services/stellar/activityScore';
import { toStellarActivityScanResult } from '../../services/stellar/activityScanQueue';

const toStellarReputationResult = async (
  address: string,
  scan: StellarActivityScanDocument | null,
): Promise<StellarReputationResult> => ({
  address,
  ownershipVerified: true,
  scanStatus: scan?.status ?? 'not_started',
  scan: scan ? { ...toStellarActivityScanResult(scan), ownershipVerified: true } : null,
  score:
    scan?.status === 'completed'
      ? { ...(await calculateStellarActivityScore(scan)), ownershipVerified: true }
      : null,
});

export default toStellarReputationResult;
