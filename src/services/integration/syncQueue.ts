import IntegrationSyncJob from '../../models/IntegrationSyncJob.js';
import type { IntegrationSyncJobDocument } from '../../types/integration/sync.js';
import { enqueueXSync } from '../../utils/services/integration/syncQueue/enqueueXSync.js';
import { enqueueGitHubSync } from '../../utils/services/integration/syncQueue/enqueueGitHubSync.js';
import { calculateXSyncSchedule } from '../../utils/services/integration/syncQueue/calculateXSyncSchedule.js';
import { failIntegrationSyncJob } from '../../utils/services/integration/syncQueue/failIntegrationSyncJob.js';
import { calculateSyncRetryDelay } from '../../utils/services/integration/syncQueue/calculateSyncRetryDelay.js';
import { claimIntegrationSyncJob } from '../../utils/services/integration/syncQueue/claimIntegrationSyncJob.js';
import {
  SYNC_JOB_LEASE_MS,
  MAX_SYNC_JOB_ATTEMPTS,
} from '../../constants/services/integration/syncQueue.js';
import { completeIntegrationSyncJob } from '../../utils/services/integration/syncQueue/completeIntegrationSyncJob.js';
import { calculateGitHubSyncSchedule } from '../../utils/services/integration/syncQueue/calculateGitHubSyncSchedule.js';

const deferIntegrationSyncJob = async (
  job: IntegrationSyncJobDocument,
  retryAfterSeconds: number,
  now = new Date(),
): Promise<void> => {
  await IntegrationSyncJob.updateOne(
    { _id: job._id, status: 'running', leaseUntil: job.leaseUntil },
    {
      $set: {
        status: 'queued',
        active: true,
        scheduledAt: new Date(now.getTime() + retryAfterSeconds * 1_000),
        leaseUntil: null,
      },
      $inc: { attempts: -1 },
    },
    { runValidators: true },
  );
};

export {
  calculateGitHubSyncSchedule,
  calculateXSyncSchedule,
  calculateSyncRetryDelay,
  claimIntegrationSyncJob,
  completeIntegrationSyncJob,
  deferIntegrationSyncJob,
  enqueueGitHubSync,
  enqueueXSync,
  failIntegrationSyncJob,
};

export { MAX_SYNC_JOB_ATTEMPTS, SYNC_JOB_LEASE_MS };
