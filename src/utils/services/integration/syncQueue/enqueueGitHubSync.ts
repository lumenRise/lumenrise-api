import { enqueueIntegrationSync } from './enqueueIntegrationSync.js';
import { calculateGitHubSyncSchedule } from './calculateGitHubSyncSchedule.js';
import type { ExternalAccountDocument } from '../../../../types/integration/model.js';
import type { IntegrationSyncJobDocument } from '../../../../types/integration/sync.js';

const enqueueGitHubSync = async (
  account: ExternalAccountDocument,
  now = new Date(),
): Promise<IntegrationSyncJobDocument> => {
  const scheduledAt = calculateGitHubSyncSchedule(account.lastSyncedAt, now);

  return enqueueIntegrationSync(account, 'github', scheduledAt, 'GitHub');
};

export { enqueueGitHubSync };
