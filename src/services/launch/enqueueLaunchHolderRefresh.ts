import { randomUUID } from 'node:crypto';

import log from '../../logger';
import publishLaunchHolderJob from './publishLaunchHolderJob';
import type { MarketIdentity } from '../../types/launch/market';
import LaunchHolderRefreshJob from '../../models/LaunchHolderRefreshJob';

const enqueueLaunchHolderRefresh = async (
  identity: MarketIdentity,
  asset: string,
  address: string,
): Promise<void> => {
  const key = { ...identity, address };
  const update = {
    $set: {
      asset,
      requestId: randomUUID(),
      status: 'queued',
      scheduledAt: new Date(),
      leaseUntil: null,
      attempts: 0,
      lastError: null,
    },
  };
  let job;

  try {
    job = await LaunchHolderRefreshJob.findOneAndUpdate(key, update, {
      upsert: true,
      runValidators: true,
      returnDocument: 'after',
    });
  } catch (error) {
    if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 11000) {
      throw error;
    }
    job = await LaunchHolderRefreshJob.findOneAndUpdate(key, update, {
      runValidators: true,
      returnDocument: 'after',
    });
  }

  if (!job) {
    throw new Error('Holder refresh could not be queued');
  }

  try {
    await publishLaunchHolderJob(job._id.toString());
  } catch (error) {
    log.warn(
      { error, jobId: job._id },
      'Holder wakeup was not published; launch worker will reconcile',
    );
  }
};

export default enqueueLaunchHolderRefresh;
