interface BaseCursorRecord {
  network: 'testnet' | 'public';
  factoryAddress: string;
  nextBlock: string;
  nextLiveBlock?: string | null;
  historyEndBlock?: string | null;
  lastLiveScannedAt?: Date | null;
  previousBlockHash: string | null;
  leaseUntil: Date | null;
  leaseOwner: string | null;
  lastScannedAt: Date | null;
}

interface BaseCheckpointRecord {
  network: 'testnet' | 'public';
  factoryAddress: string;
  blockNumber: number;
  blockHash: string;
  finalized: boolean;
}

export type { BaseCheckpointRecord, BaseCursorRecord };
