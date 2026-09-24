import { calculateSyncRetryDelay } from './calculateSyncRetryDelay.js';
import IntegrationSyncJob from '../../../../models/IntegrationSyncJob.js';
import type { IntegrationSyncJobDocument } from '../../../../types/integration/sync.js';

const failIntegrationSyncJob = async (
  job: IntegrationSyncJobDocument,
  error: string,
  retryable: boolean,
  failedAt = new Date(),
): Promise<void> => {
  const shouldRetry = retryable && job.attempts < job.maxAttempts;
  const status = shouldRetry ? 'queued' : 'failed';
  const completedAt = shouldRetry ? null : failedAt;
  const scheduledAt = shouldRetry
    ? new Date(failedAt.getTime() + calculateSyncRetryDelay(job.attempts))
    : job.scheduledAt;

  await IntegrationSyncJob.updateOne(
    { _id: job._id, status: 'running', leaseUntil: job.leaseUntil },
    {
      $set: {
        status,
        active: shouldRetry,
        scheduledAt,
        completedAt,
        leaseUntil: null,
        lastError: error.slice(0, 2_000),
      },
    },
    { runValidators: true },
  );
};

export { failIntegrationSyncJob };
