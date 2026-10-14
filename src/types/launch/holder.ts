import type { MarketIdentity } from './market';

interface LaunchHolderRecord extends MarketIdentity {
  address: string;
  asset: string;
  balance: string;
  balanceSort: string;
  observedAt: Date;
}

interface HolderPosition {
  balanceSort: string;
  address: string;
}

interface HolderRequest {
  identity: MarketIdentity;
  limit: number;
  after: HolderPosition | null;
}

export type { LaunchHolderRecord, HolderPosition, HolderRequest };
