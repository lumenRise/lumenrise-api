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

interface ReputationSnapshotRecord {
  identity: Types.ObjectId;
  category: ReputationCategory;
  status: ReputationSnapshotStatus;
  algorithmVersion: string;
  score: number | null;
  signals: ReputationSignalRecord[];
  calculatedAt: Date;
  createdAt: Date;
}

interface GitHubDeveloperMetrics {
  accountAgeDays: number;
  publicRepositoryCount: number;
  recentPublicEventCount: number | null;
  sampledOriginalRepositoryStars: number | null;
}

interface ReputationSignalInput {
  key: string;
  rawValue: number;
  scoreCap: number;
  baseWeight: number;
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

interface ReputationSnapshotResult {
  category: ReputationCategory;
  status: ReputationSnapshotStatus;
  algorithmVersion: string;
  score: number | null;
  signals: ReputationSignalResult[];
  calculatedAt: string;
}

type ReputationSnapshotDocument = HydratedDocument<ReputationSnapshotRecord>;

export type {
  GitHubDeveloperMetrics,
  ReputationCategory,
  ReputationSignalInput,
  ReputationSignalRecord,
  ReputationSignalResult,
  ReputationSnapshotDocument,
  ReputationSnapshotRecord,
  ReputationSnapshotResult,
  ReputationSnapshotStatus,
};
