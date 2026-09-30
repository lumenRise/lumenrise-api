import log from '../../../../logger';
import { enqueueIntegrationSync } from './enqueueIntegrationSync';
import { calculateGitHubSyncSchedule } from './calculateGitHubSyncSchedule';
import type { ExternalAccountDocument } from '../../../../types/integration/model';
import type { IntegrationSyncJobDocument } from '../../../../types/integration/sync';
import { publishGitHubSyncJob } from '../../../../services/integration/publishGitHubSyncJob';

const enqueueGitHubSync = async (
  account: ExternalAccountDocument,
  now = new Date(),
): Promise<IntegrationSyncJobDocument> => {
  const scheduledAt = calculateGitHubSyncSchedule(account.lastSyncedAt, now);

  const job = await enqueueIntegrationSync(account, 'github', scheduledAt, 'GitHub');

  try {
    await publishGitHubSyncJob(job._id.toString());
  } catch (error) {
    log.warn({ error, jobId: job._id }, 'GitHub sync wakeup was not published; worker will reconcile');
  }

  return job;
};

export { enqueueGitHubSync };
