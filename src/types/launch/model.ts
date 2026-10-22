interface LaunchMetadata {
  name: string;
  description: string;
  logo: string;
  symbol: string;
  website?: string;
  xAccount?: string;
}

interface LaunchRecord {
  network: 'testnet' | 'public';
  factoryContractId: string;
  factoryIndex: number;
  contractId: string;
  slug: string;
  owner: string;
  asset: string;
  pair: string;
  metadata: LaunchMetadata;
  config: Record<string, unknown>;
  state: Record<string, unknown>;
  asOfLedger: number;
  observedAt: Date;
  createdAt?: Date | null;
  creationLedger?: number | null;
  creationTransactionHash?: string | null;
  stateAsOfLedger: number;
  stateObservedAt: Date;
  nextStatePollAt?: Date | null;
}

interface LaunchSchedule {
  ends_at?: string;
}

export type { LaunchMetadata, LaunchRecord, LaunchSchedule };
