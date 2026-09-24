import { calculateXSyncSchedule } from './calculateXSyncSchedule.js';
import { enqueueIntegrationSync } from './enqueueIntegrationSync.js';
import type { ExternalAccountDocument } from '../../../../types/integration/model.js';
import type { IntegrationSyncJobDocument } from '../../../../types/integration/sync.js';

const enqueueXSync = async (
  account: ExternalAccountDocument,
  now = new Date(),
): Promise<IntegrationSyncJobDocument> => {
  const scheduledAt = calculateXSyncSchedule(account.lastSyncedAt, now);

  return enqueueIntegrationSync(account, 'x', scheduledAt, 'X');
};

export { enqueueXSync };
