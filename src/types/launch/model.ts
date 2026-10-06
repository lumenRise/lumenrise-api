interface LaunchMetadata {
  name: string;
  description: string;
  logo: string;
  symbol: string;
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
}

export type { LaunchMetadata, LaunchRecord };
