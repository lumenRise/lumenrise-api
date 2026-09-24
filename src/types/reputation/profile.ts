import type { ReputationSnapshotResult } from './model.js';
import type { StellarReputationResult } from './stellar.js';

interface ReputationProfileResult {
  identity: {
    id: string;
    name: string | null;
    primaryWalletAddress: string | null;
  };
  developer: ReputationSnapshotResult | null;
  social: ReputationSnapshotResult | null;
  stellar: StellarReputationResult | null;
}

export type { ReputationProfileResult };
