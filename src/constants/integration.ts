import type {
  ExternalAccountProvider,
  ExternalAccountStatus,
  OAuthPurpose,
} from '../types/integration/model.js';

const OAUTH_PURPOSES = ['register', 'connect'] as const satisfies readonly OAuthPurpose[];
const EXTERNAL_ACCOUNT_PROVIDERS = [
  'github',
  'gitlab',
  'x',
] as const satisfies readonly ExternalAccountProvider[];
const EXTERNAL_ACCOUNT_STATUSES = [
  'connected',
  'disconnected',
] as const satisfies readonly ExternalAccountStatus[];
const GITHUB_SYNC_LEASE_MS = 3_600_000;
const GITHUB_SYNC_MIN_INTERVAL_MS = 900_000;
const GITLAB_SYNC_LEASE_MS = 3_600_000;
const GITLAB_SYNC_MIN_INTERVAL_MS = 900_000;
const X_SYNC_LEASE_MS = 3_600_000;
const X_SYNC_MIN_INTERVAL_MS = 900_000;
const INTEGRATION_SYNC_JOB_STATUSES = [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const;

export {
  EXTERNAL_ACCOUNT_PROVIDERS,
  EXTERNAL_ACCOUNT_STATUSES,
  GITHUB_SYNC_LEASE_MS,
  GITHUB_SYNC_MIN_INTERVAL_MS,
  GITLAB_SYNC_LEASE_MS,
  GITLAB_SYNC_MIN_INTERVAL_MS,
  INTEGRATION_SYNC_JOB_STATUSES,
  OAUTH_PURPOSES,
  X_SYNC_LEASE_MS,
  X_SYNC_MIN_INTERVAL_MS,
};
