import type { ReputationCategory, ReputationSnapshotStatus } from '../types/reputation/model.js';

const REPUTATION_CATEGORIES = [
  'social',
  'developer',
] as const satisfies readonly ReputationCategory[];
const REPUTATION_SNAPSHOT_STATUSES = [
  'complete',
  'partial',
  'failed',
] as const satisfies readonly ReputationSnapshotStatus[];
const GITHUB_DEVELOPER_ALGORITHM_VERSION = 'github-developer-v1';

export { GITHUB_DEVELOPER_ALGORITHM_VERSION, REPUTATION_CATEGORIES, REPUTATION_SNAPSHOT_STATUSES };
