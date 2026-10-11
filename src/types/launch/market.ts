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
  creatorFee: string;
  userAmount: string;
  executionPrice: string;
  priceSort: string;
}

interface TradeCursorRecord {
  network: 'testnet' | 'public';
  contractId: string;
  cursor: string | null;
  nextLedger: number;
  coverageFrom: Date;
  scannedThroughLedger: number;
  scannedAt: Date;
  nextPollAt: Date;
  historyGap: boolean;
  unclassifiedCount: number;
}

interface PriceSampleRecord {
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

interface CurvePriceParams {
  curve: Record<string, unknown>;
}

interface TradeCoverage {
  source: 'successful_direct_curve_calls';
  historyComplete: false;
  coverageFrom: string | null;
  scannedThroughLedger: number | null;
  scannedAt: string | null;
  stale: boolean;
  caughtUp: boolean;
  historyGap: boolean;
  unclassifiedCount: number;
}

type ChartRange = '1D' | '1W' | '1M' | '3M' | 'ALL';

export type {
  TradeRecord,
  TradeCursorRecord,
  PriceSampleRecord,
  MarketIdentity,
  TradePosition,
  CurvePriceParams,
  TradeCoverage,
  ChartRange,
};
