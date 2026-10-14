interface TradeRecord {
  network: 'testnet' | 'public';
  contractId: string;
  transactionHash: string;
  operationIndex: number;
  transactionIndex: number;
  ledger: number;
  tradedAt: Date;
  trader: string;
  side: 'buy' | 'sell';
  assetAmount: string;
  grossAmount: string;
  executionPrice: string;
  priceRecordedAt?: Date;
}

interface PriceSampleRecord {
  observationKey?: string;
  network: 'testnet' | 'public';
  contractId: string;
  bucket: Date;
  sampledAt: Date;
  ledger: number;
  price: string;
  priceSort: string;
}

interface MarketIdentity {
  network: TradeRecord['network'];
  contractId: string;
}

interface TradePosition {
  tradedAt: Date;
  ledger: number;
  transactionIndex: number;
  operationIndex: number;
}

type ChartRange = '1D' | '1W' | '1M' | '3M' | 'ALL';

export type { TradeRecord, PriceSampleRecord, MarketIdentity, TradePosition, ChartRange };
