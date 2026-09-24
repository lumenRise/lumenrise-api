import type { StellarActivityPageSummary } from './activity.js';

type StellarOperationOrder = 'asc' | 'desc';

interface StellarHorizonOperation {
  paging_token: string;
  type: string;
  type_i: number;
  created_at: string;
  transaction_hash: string;
  source_account: string;
  [key: string]: unknown;
}

interface StellarHorizonOperationsPage {
  _embedded: { records: StellarHorizonOperation[] };
}

interface StellarOperationResult {
  pagingToken: string;
  type: string;
  typeId: number;
  createdAt: string;
  transactionHash: string;
  sourceAccount: string;
  details: Record<string, unknown>;
}

interface StellarOperationsResult {
  address: string;
  ownershipVerified: false;
  order: StellarOperationOrder;
  limit: number;
  items: StellarOperationResult[];
  summary: StellarActivityPageSummary;
  nextCursor: string | null;
}

export type {
  StellarHorizonOperation,
  StellarHorizonOperationsPage,
  StellarOperationOrder,
  StellarOperationResult,
  StellarOperationsResult,
};
