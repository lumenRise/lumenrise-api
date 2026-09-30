import log from '../../../../logger';
import { calculateXSyncSchedule } from './calculateXSyncSchedule';
import { enqueueIntegrationSync } from './enqueueIntegrationSync';
import type { ExternalAccountDocument } from '../../../../types/integration/model';
import type { IntegrationSyncJobDocument } from '../../../../types/integration/sync';
import { publishReputationJob } from '../../../../services/integration/publishReputationJob';

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
