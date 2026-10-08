import type { ReputationSnapshotResult } from './model';
import type { StellarReputationResult } from './stellar';

interface ReputationProfileResult {
  identity: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    primaryWalletAddress: string | null;
  };
  developer: ReputationSnapshotResult | null;
  social: ReputationSnapshotResult | null;
  stellar: StellarReputationResult | null;
}

export type { ReputationProfileResult };
