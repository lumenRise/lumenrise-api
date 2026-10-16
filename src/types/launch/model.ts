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
  owner: string;
  asset: string;
  pair: string;
  metadata: LaunchMetadata;
  config: Record<string, unknown>;
  state: Record<string, unknown>;
  asOfLedger: number;
  observedAt: Date;
  stateAsOfLedger: number;
  stateObservedAt: Date;
  nextStatePollAt?: Date | null;
}

export type { LaunchMetadata, LaunchRecord };
