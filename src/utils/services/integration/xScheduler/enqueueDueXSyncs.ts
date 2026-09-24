import env from '../../../../env.js';
import ExternalAccount from '../../../../models/ExternalAccount.js';
import IntegrationSyncJob from '../../../../models/IntegrationSyncJob.js';
import { enqueueXSync } from '../../../../services/integration/syncQueue.js';

const enqueueDueXSyncs = async (now = new Date()): Promise<number> => {
  if (env.X_AUTO_SYNC_INTERVAL_HOURS <= 0) {
    return 0;
  }

  const dueBefore = new Date(now.getTime() - env.X_AUTO_SYNC_INTERVAL_HOURS * 3_600_000);

  const accounts = ExternalAccount.find({
    provider: 'x',
    status: 'connected',
    $or: [{ lastSyncedAt: null }, { lastSyncedAt: { $lte: dueBefore } }],
  }).cursor();

  let enqueued = 0;

  for await (const account of accounts) {
    const latestJob = await IntegrationSyncJob.findOne({
      externalAccount: account._id,
      provider: 'x',
    }).sort({ createdAt: -1 });

    if (latestJob?.active || (latestJob && latestJob.createdAt > dueBefore)) {
      continue;
    }

    await enqueueXSync(account, now);
    enqueued += 1;
  }

  return enqueued;
};

export { enqueueDueXSyncs };
