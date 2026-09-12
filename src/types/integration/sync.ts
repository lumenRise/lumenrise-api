import type { GitHubDataSnapshotDocument } from '../reputation/github.js';

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

export type {
  GitHubSyncDeferred,
  GitHubSyncOutcome,
  GitHubSyncReauthorizationRequired,
  GitHubSyncSuccess,
};
