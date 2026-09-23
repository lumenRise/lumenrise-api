import type { HydratedDocument, Types } from 'mongoose';

import type { XDataSnapshotDocument } from '../reputation/x.js';
import type { GitHubDataSnapshotDocument } from '../reputation/github.js';
import type { GitLabDataSnapshotDocument } from '../reputation/gitlab.js';

type IntegrationSyncJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
type IntegrationSyncJobProvider = 'github' | 'gitlab' | 'x';

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

interface GitLabSyncSuccess {
  state: 'synchronized';
  snapshot: GitLabDataSnapshotDocument;
}

interface GitLabSyncDeferred {
  state: 'in_progress' | 'too_recent';
  retryAfterSeconds: number;
}

interface GitLabSyncReauthorizationRequired {
  state: 'reauthorization_required';
}

type GitLabSyncOutcome = GitLabSyncSuccess | GitLabSyncDeferred | GitLabSyncReauthorizationRequired;

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

type XSyncOutcome = XSyncSuccess | XSyncDeferred | XSyncReauthorizationRequired;
type IntegrationSyncJobDocument = HydratedDocument<IntegrationSyncJobRecord>;

export type {
  GitHubSyncDeferred,
  GitHubSyncOutcome,
  GitHubSyncReauthorizationRequired,
  GitHubSyncSuccess,
  GitLabSyncDeferred,
  GitLabSyncOutcome,
  GitLabSyncReauthorizationRequired,
  GitLabSyncSuccess,
  IntegrationSyncJobDocument,
  IntegrationSyncJobProvider,
  IntegrationSyncJobRecord,
  IntegrationSyncJobResult,
  IntegrationSyncJobStatus,
  XSyncDeferred,
  XSyncOutcome,
  XSyncReauthorizationRequired,
  XSyncSuccess,
};
