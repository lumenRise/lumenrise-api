import log from '../../../../logger.js';
import { calculateXSyncSchedule } from './calculateXSyncSchedule.js';
import { enqueueIntegrationSync } from './enqueueIntegrationSync.js';
import type { ExternalAccountDocument } from '../../../../types/integration/model.js';
import type { IntegrationSyncJobDocument } from '../../../../types/integration/sync.js';
import { publishReputationJob } from '../../../../services/integration/publishReputationJob.js';

const X_SYNC_QUEUE = 'lumenrise.reputation.x-sync.v1';

const enqueueXSync = async (
  account: ExternalAccountDocument,
  now = new Date(),
): Promise<IntegrationSyncJobDocument> => {
  const scheduledAt = calculateXSyncSchedule(account.lastSyncedAt, now);

  const job = await enqueueIntegrationSync(account, 'x', scheduledAt, 'X');
  try {
    await publishReputationJob(X_SYNC_QUEUE, job._id.toString());
  } catch (error) {
    log.warn({ error, jobId: job._id }, 'X sync wakeup failed; MongoDB job remains queued');
  }
  return job;
};

export { enqueueXSync };
