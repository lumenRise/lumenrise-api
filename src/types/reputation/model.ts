import type { HydratedDocument, Types } from 'mongoose';

import type { ExternalAccountProvider } from '../integration/model.js';

type ReputationCategory = 'social' | 'developer';
type ReputationSnapshotStatus = 'complete' | 'partial' | 'failed';

interface ReputationSignalRecord {
  provider: ExternalAccountProvider;
  key: string;
  rawValue: number;
  normalizedScore: number;
  weight: number;
  contribution: number;
  observedAt: Date;
}

interface ReputationSourceRecord {
  provider: ExternalAccountProvider;
  snapshot: Types.ObjectId;
  dataVersion: string;
  collectedAt: Date;
}

interface ReputationSnapshotRecord {
  identity: Types.ObjectId;
  category: ReputationCategory;
  status: ReputationSnapshotStatus;
  algorithmVersion: string;
  score: number | null;
  signals: ReputationSignalRecord[];
  sources: ReputationSourceRecord[];
  calculatedAt: Date;
  createdAt: Date;
}

interface ReputationSignalResult {
  provider: ExternalAccountProvider;
  key: string;
  rawValue: number;
  normalizedScore: number;
  weight: number;
  contribution: number;
  observedAt: string;
}

interface ReputationSourceResult {
  provider: ExternalAccountProvider;
  snapshotId: string;
  dataVersion: string;
  collectedAt: string;
}

interface ReputationSnapshotResult {
  category: ReputationCategory;
  status: ReputationSnapshotStatus;
  algorithmVersion: string;
  score: number | null;
  signals: ReputationSignalResult[];
  sources: ReputationSourceResult[];
  calculatedAt: string;
}

type ReputationSnapshotDocument = HydratedDocument<ReputationSnapshotRecord>;

export type {
  ReputationCategory,
  ReputationSignalRecord,
  ReputationSignalResult,
  ReputationSourceRecord,
  ReputationSourceResult,
  ReputationSnapshotDocument,
  ReputationSnapshotRecord,
  ReputationSnapshotResult,
  ReputationSnapshotStatus,
};
