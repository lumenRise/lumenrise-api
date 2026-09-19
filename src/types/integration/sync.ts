import type { HydratedDocument, Types } from 'mongoose';

import type { GitHubDataSnapshotDocument } from '../reputation/github.js';

type IntegrationSyncJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

interface IntegrationSyncJobRecord {
  identity: Types.ObjectId;
  externalAccount: Types.ObjectId;
  provider: 'github';
  status: IntegrationSyncJobStatus;
  active: boolean;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  leaseUntil: Date | null;
  lastError: string | null;
  resultSnapshot: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

interface IntegrationSyncJobResult {
  id: string;
  provider: 'github';
  status: IntegrationSyncJobStatus;
  attempts: number;
  maxAttempts: number;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  lastError: string | null;
  resultSnapshotId: string | null;
}

interface GitHubSyncSuccess {
  state: 'synchronized';
  snapshot: GitHubDataSnapshotDocument;
}

interface GitHubSyncDeferred {
  state: 'in_progress' | 'too_recent';
  retryAfterSeconds: number;
}

interface GitHubSyncReauthorizationRequired {
  state: 'reauthorization_required';
}

type GitHubSyncOutcome = GitHubSyncSuccess | GitHubSyncDeferred | GitHubSyncReauthorizationRequired;
type IntegrationSyncJobDocument = HydratedDocument<IntegrationSyncJobRecord>;

export type {
  GitHubSyncDeferred,
  GitHubSyncOutcome,
  GitHubSyncReauthorizationRequired,
  GitHubSyncSuccess,
  IntegrationSyncJobDocument,
  IntegrationSyncJobRecord,
  IntegrationSyncJobResult,
  IntegrationSyncJobStatus,
};
