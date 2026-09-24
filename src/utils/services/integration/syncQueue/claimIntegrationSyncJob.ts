import IntegrationSyncJob from '../../../../models/IntegrationSyncJob.js';
import type { IntegrationSyncJobDocument } from '../../../../types/integration/sync.js';
import { SYNC_JOB_LEASE_MS } from '../../../../constants/services/integration/syncQueue.js';

const claimIntegrationSyncJob = async (
  now = new Date(),
): Promise<IntegrationSyncJobDocument | null> =>
  IntegrationSyncJob.findOneAndUpdate(
    {
      active: true,
      $or: [
        { status: 'queued', scheduledAt: { $lte: now } },
        { status: 'running', leaseUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        status: 'running',
        startedAt: now,
        completedAt: null,
        leaseUntil: new Date(now.getTime() + SYNC_JOB_LEASE_MS),
        lastError: null,
      },
      $inc: { attempts: 1 },
    },
    { sort: { scheduledAt: 1 }, runValidators: true, returnDocument: 'after' },
  );

export { claimIntegrationSyncJob };
