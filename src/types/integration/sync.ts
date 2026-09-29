import type { HydratedDocument, Types } from 'mongoose';

import type { XDataSnapshotDocument } from '../reputation/x.js';
import type { GitHubDataSnapshotDocument } from '../reputation/github.js';

type IntegrationSyncJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
type IntegrationSyncJobProvider = 'github' | 'x';

interface IntegrationSyncJobRecord {
  identity: Types.ObjectId;
  externalAccount: Types.ObjectId;
  provider: IntegrationSyncJobProvider;
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
  provider: IntegrationSyncJobProvider;
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

interface XSyncSuccess {
  state: 'synchronized';
  snapshot: XDataSnapshotDocument;
}

interface XSyncDeferred {
  state: 'in_progress' | 'too_recent';
  retryAfterSeconds: number;
}

interface XSyncReauthorizationRequired {
  state: 'reauthorization_required';
}

interface XSyncDisconnected {
  state: 'disconnected';
}

type XSyncOutcome = XSyncSuccess | XSyncDeferred | XSyncReauthorizationRequired | XSyncDisconnected;
type IntegrationSyncJobDocument = HydratedDocument<IntegrationSyncJobRecord>;

export type {
  GitHubSyncDeferred,
  GitHubSyncOutcome,
  GitHubSyncReauthorizationRequired,
  GitHubSyncSuccess,
  IntegrationSyncJobDocument,
  IntegrationSyncJobProvider,
  IntegrationSyncJobRecord,
  IntegrationSyncJobResult,
  IntegrationSyncJobStatus,
  XSyncDeferred,
  XSyncDisconnected,
  XSyncOutcome,
  XSyncReauthorizationRequired,
  XSyncSuccess,
};
