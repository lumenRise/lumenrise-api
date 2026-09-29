import log from '../../../../logger.js';
import { enqueueIntegrationSync } from './enqueueIntegrationSync.js';
import { calculateGitHubSyncSchedule } from './calculateGitHubSyncSchedule.js';
import type { ExternalAccountDocument } from '../../../../types/integration/model.js';
import type { IntegrationSyncJobDocument } from '../../../../types/integration/sync.js';
import { publishGitHubSyncJob } from '../../../../services/integration/publishGitHubSyncJob.js';

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
