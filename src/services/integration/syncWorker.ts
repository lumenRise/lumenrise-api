import env from '../../env.js';
import log from '../../logger.js';
import { syncGitHubAccount } from './githubSync.js';
import { syncGitLabAccount } from './gitlabSync.js';
import ExternalAccount from '../../models/ExternalAccount.js';
import type { IntegrationSyncJobDocument } from '../../types/integration/sync.js';
import {
  claimIntegrationSyncJob,
  completeIntegrationSyncJob,
  deferIntegrationSyncJob,
  failIntegrationSyncJob,
} from './syncQueue.js';

let workerTimer: NodeJS.Timeout | null = null;
let activeTick: Promise<void> | null = null;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown synchronization error';
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
    const outcome =
      job.provider === 'github'
        ? await syncGitHubAccount(account)
        : await syncGitLabAccount(account);

    if (outcome.state === 'synchronized') {
      await completeIntegrationSyncJob(job, outcome.snapshot._id);
      return;
    }

    if (outcome.state === 'reauthorization_required') {
      await failIntegrationSyncJob(job, `${job.provider} account must be reauthorized`, false);
      return;
    }

    await deferIntegrationSyncJob(job, outcome.retryAfterSeconds);
  } catch (error) {
    await failIntegrationSyncJob(job, getErrorMessage(error), true);
    log.warn({ error, syncJobId: job._id }, 'Integration synchronization job failed');
  }
};
const runIntegrationSyncWorkerTick = async (): Promise<void> => {
  const job = await claimIntegrationSyncJob();

  if (!job) {
    return;
  }

  await processIntegrationSyncJob(job);
};
const scheduleWorkerTick = (): void => {
  if (activeTick) {
    return;
  }

  activeTick = runIntegrationSyncWorkerTick()
    .catch((error: unknown) => {
      log.error({ error }, 'Integration synchronization worker tick failed');
    })
    .finally(() => {
      activeTick = null;
    });
};
const startIntegrationSyncWorker = (): void => {
  if (workerTimer) {
    return;
  }

  scheduleWorkerTick();
  workerTimer = setInterval(scheduleWorkerTick, env.SYNC_WORKER_POLL_INTERVAL_MS);
  workerTimer.unref();
};
const stopIntegrationSyncWorker = async (): Promise<void> => {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }

  await activeTick;
};

export { processIntegrationSyncJob, startIntegrationSyncWorker, stopIntegrationSyncWorker };
