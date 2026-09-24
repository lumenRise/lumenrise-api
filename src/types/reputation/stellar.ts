import type { StellarActivityScoreResult } from '../stellar/score.js';
import type { StellarActivityScanResult, StellarActivityScanStatus } from '../stellar/scan.js';

type VerifiedStellarActivityScanResult = Omit<StellarActivityScanResult, 'ownershipVerified'> & {
  ownershipVerified: true;
};
type VerifiedStellarActivityScoreResult = Omit<StellarActivityScoreResult, 'ownershipVerified'> & {
  ownershipVerified: true;
};

interface StellarReputationResult {
  address: string;
  ownershipVerified: true;
  scanStatus: StellarActivityScanStatus | 'not_started';
  scan: VerifiedStellarActivityScanResult | null;
  score: VerifiedStellarActivityScoreResult | null;
}

export type { StellarReputationResult };
