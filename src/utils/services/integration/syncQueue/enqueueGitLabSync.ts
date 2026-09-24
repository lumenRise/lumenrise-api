import { enqueueIntegrationSync } from './enqueueIntegrationSync.js';
import { calculateGitLabSyncSchedule } from './calculateGitLabSyncSchedule.js';
import type { ExternalAccountDocument } from '../../../../types/integration/model.js';
import type { IntegrationSyncJobDocument } from '../../../../types/integration/sync.js';

const enqueueGitLabSync = async (
  account: ExternalAccountDocument,
  now = new Date(),
): Promise<IntegrationSyncJobDocument> => {
  const scheduledAt = calculateGitLabSyncSchedule(account.lastSyncedAt, now);

  return enqueueIntegrationSync(account, 'gitlab', scheduledAt, 'GitLab');
};

export { enqueueGitLabSync };
