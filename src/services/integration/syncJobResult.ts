import type {
  IntegrationSyncJobDocument,
  IntegrationSyncJobResult,
} from '../../types/integration/sync.js';

const createIntegrationSyncJobResult = (
  job: IntegrationSyncJobDocument,
): IntegrationSyncJobResult => ({
  id: job._id.toString(),
  provider: job.provider,
  status: job.status,
  attempts: job.attempts,
  maxAttempts: job.maxAttempts,
  scheduledAt: job.scheduledAt.toISOString(),
  startedAt: job.startedAt?.toISOString() ?? null,
  completedAt: job.completedAt?.toISOString() ?? null,
  lastError: job.lastError,
  resultSnapshotId: job.resultSnapshot?.toString() ?? null,
});

export default createIntegrationSyncJobResult;
