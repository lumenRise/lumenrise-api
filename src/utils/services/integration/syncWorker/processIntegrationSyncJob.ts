import log from '../../../../logger.js';
import { getErrorMessage } from './getErrorMessage.js';
import { synchronizeAccount } from './synchronizeAccount.js';
import ExternalAccount from '../../../../models/ExternalAccount.js';
import XRateLimitError from '../../../../services/integration/xRateLimit.js';
import XApiResponseError from '../../../../services/integration/xApiResponseError.js';
import type { IntegrationSyncJobDocument } from '../../../../types/integration/sync.js';
import {
  completeIntegrationSyncJob,
  deferIntegrationSyncJob,
  failIntegrationSyncJob,
} from '../../../../services/integration/syncQueue.js';

const processIntegrationSyncJob = async (job: IntegrationSyncJobDocument): Promise<void> => {
  const account = await ExternalAccount.findOne({
    _id: job.externalAccount,
    identity: job.identity,
    provider: job.provider,
    status: 'connected',
  });

  if (!account) {
    await failIntegrationSyncJob(job, `Connected ${job.provider} account was not found`, false);
    return;
  }

  try {
    const outcome = await synchronizeAccount(job, account);

    if (outcome.state === 'synchronized') {
      await completeIntegrationSyncJob(job, outcome.snapshot._id);
      return;
    }

    if (outcome.state === 'reauthorization_required') {
      await failIntegrationSyncJob(job, `${job.provider} account must be reauthorized`, false);
      return;
    }

    if (outcome.state === 'disconnected') {
      await failIntegrationSyncJob(job, 'X account was disconnected during synchronization', false);
      return;
    }

    await deferIntegrationSyncJob(job, outcome.retryAfterSeconds);
  } catch (error) {
    if (job.provider === 'x' && error instanceof XRateLimitError) {
      await deferIntegrationSyncJob(job, error.retryAfterSeconds);

      log.warn(
        { syncJobId: job._id, retryAfterSeconds: error.retryAfterSeconds },
        'X sync deferred',
      );

      return;
    }

    if (job.provider === 'x' && error instanceof XApiResponseError) {
      await failIntegrationSyncJob(job, error.message, error.retryable);

      log.warn({ error, syncJobId: job._id }, 'X API synchronization request failed');

      return;
    }

    await failIntegrationSyncJob(job, getErrorMessage(error), true);

    log.warn({ error, syncJobId: job._id }, 'Integration synchronization job failed');
  }
};

export { processIntegrationSyncJob };
