import IntegrationSyncJob from '../../../../models/IntegrationSyncJob.js';
import type { ExternalAccountDocument } from '../../../../types/integration/model.js';
import { MAX_SYNC_JOB_ATTEMPTS } from '../../../../constants/services/integration/syncQueue.js';
import type {
  IntegrationSyncJobDocument,
  IntegrationSyncJobProvider,
} from '../../../../types/integration/sync.js';

const enqueueIntegrationSync = async (
  account: ExternalAccountDocument,
  provider: IntegrationSyncJobProvider,
  scheduledAt: Date,
  providerName: string,
): Promise<IntegrationSyncJobDocument> => {
  if (account.provider !== provider) {
    throw new Error(`${providerName} synchronization requires a ${providerName} account`);
  }

  try {
    const job = await IntegrationSyncJob.findOneAndUpdate(
      { externalAccount: account._id, active: true },
      {
        $setOnInsert: {
          identity: account.identity,
          externalAccount: account._id,
          provider,
          status: 'queued',
          active: true,
          attempts: 0,
          maxAttempts: MAX_SYNC_JOB_ATTEMPTS,
          scheduledAt,
          startedAt: null,
          completedAt: null,
          leaseUntil: null,
          lastError: null,
          resultSnapshot: null,
        },
      },
      {
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        returnDocument: 'after',
      },
    );

    if (!job) {
      throw new Error(`${providerName} synchronization job could not be queued`);
    }

    return job;
  } catch (error) {
    const isDuplicateKey =
      typeof error === 'object' && error !== null && Reflect.get(error, 'code') === 11_000;

    if (!isDuplicateKey) {
      throw error;
    }

    const existingJob = await IntegrationSyncJob.findOne({
      externalAccount: account._id,
      active: true,
    });

    if (!existingJob) {
      throw error;
    }

    return existingJob;
  }
};

export { enqueueIntegrationSync };
