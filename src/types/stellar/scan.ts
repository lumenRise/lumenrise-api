import type { HydratedDocument, Types } from 'mongoose';

import type { StellarActivityPageSummary } from './activity.js';

type StellarActivityScanStatus = 'queued' | 'running' | 'completed' | 'failed';
type StellarActivityAggregate = Omit<StellarActivityPageSummary, 'scope'> & {
  scope: 'scanned_pages';
};

interface StellarActivityScanRecord {
  identity: Types.ObjectId;
  address: string;
  sourceUrl: string;
  status: StellarActivityScanStatus;
  active: boolean;
  cursor: string | null;
  summary: StellarActivityAggregate;
  lastDay: string | null;
  lastTransactionHash: string | null;
  pagesProcessed: number;
  consecutiveFailures: number;
  scheduledAt: Date;
  leaseUntil: Date | null;
  completedAt: Date | null;
  lastProcessedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface StellarActivityScanResult {
  id: string;
  address: string;
  ownershipVerified: false;
  source: 'horizon';
  status: StellarActivityScanStatus;
  availableHistoryScanned: boolean;
  cursor: string | null;
  pagesProcessed: number;
  summary: StellarActivityAggregate;
  lastProcessedAt: string | null;
  completedAt: string | null;
  lastError: string | null;
}

type StellarActivityScanDocument = HydratedDocument<StellarActivityScanRecord>;
interface StellarActivityMergeResult {
  summary: StellarActivityAggregate;
  lastDay: string | null;
  lastTransactionHash: string | null;
}

interface StellarActivityScanEnqueueResult {
  scan: StellarActivityScanDocument;
  conflict: boolean;
}

export type {
  StellarActivityAggregate,
  StellarActivityMergeResult,
  StellarActivityScanDocument,
  StellarActivityScanEnqueueResult,
  StellarActivityScanRecord,
  StellarActivityScanResult,
  StellarActivityScanStatus,
};
