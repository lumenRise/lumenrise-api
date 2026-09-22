import type { Types } from 'mongoose';

import IntegrationSyncJob from '../../models/IntegrationSyncJob.js';
import { GITHUB_SYNC_MIN_INTERVAL_MS } from '../../constants/integration.js';
import type { ExternalAccountDocument } from '../../types/integration/model.js';
import type { IntegrationSyncJobDocument } from '../../types/integration/sync.js';

const MAX_SYNC_JOB_ATTEMPTS = 5;
const SYNC_JOB_LEASE_MS = 3_600_000;
const calculateSyncRetryDelay = (attempts: number): number =>
  Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 3_600_000);
const calculateGitHubSyncSchedule = (lastSyncedAt: Date | null, now = new Date()): Date => {
  if (!lastSyncedAt) {
    return now;
  }

  return new Date(Math.max(now.getTime(), lastSyncedAt.getTime() + GITHUB_SYNC_MIN_INTERVAL_MS));
};
const enqueueGitHubSync = async (
  account: ExternalAccountDocument,
  now = new Date(),
): Promise<IntegrationSyncJobDocument> => {
  const scheduledAt = calculateGitHubSyncSchedule(account.lastSyncedAt, now);

  try {
    const job = await IntegrationSyncJob.findOneAndUpdate(
      { externalAccount: account._id, active: true },
      {
        $setOnInsert: {
          identity: account.identity,
          externalAccount: account._id,
          provider: 'github',
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
      throw new Error('GitHub synchronization job could not be queued');
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
const claimIntegrationSyncJob = async (
  now = new Date(),
): Promise<IntegrationSyncJobDocument | null> =>
  IntegrationSyncJob.findOneAndUpdate(
    {
      active: true,
      $or: [
        { status: 'queued', scheduledAt: { $lte: now } },
        { status: 'running', leaseUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        status: 'running',
        startedAt: now,
        completedAt: null,
        leaseUntil: new Date(now.getTime() + SYNC_JOB_LEASE_MS),
        lastError: null,
      },
      $inc: { attempts: 1 },
    },
    { sort: { scheduledAt: 1 }, runValidators: true, returnDocument: 'after' },
  );
const completeIntegrationSyncJob = async (
  job: IntegrationSyncJobDocument,
  snapshotId: Types.ObjectId,
  completedAt = new Date(),
): Promise<void> => {
  await IntegrationSyncJob.updateOne(
    { _id: job._id, status: 'running', leaseUntil: job.leaseUntil },
    {
      $set: {
        status: 'completed',
        active: false,
        completedAt,
        leaseUntil: null,
        resultSnapshot: snapshotId,
      },
    },
    { runValidators: true },
  );
};
const failIntegrationSyncJob = async (
  job: IntegrationSyncJobDocument,
  error: string,
  retryable: boolean,
  failedAt = new Date(),
): Promise<void> => {
  const shouldRetry = retryable && job.attempts < job.maxAttempts;
  const status = shouldRetry ? 'queued' : 'failed';
  const completedAt = shouldRetry ? null : failedAt;
  const scheduledAt = shouldRetry
    ? new Date(failedAt.getTime() + calculateSyncRetryDelay(job.attempts))
    : job.scheduledAt;

  await IntegrationSyncJob.updateOne(
    { _id: job._id, status: 'running', leaseUntil: job.leaseUntil },
    {
      $set: {
        status,
        active: shouldRetry,
        scheduledAt,
        completedAt,
        leaseUntil: null,
        lastError: error.slice(0, 2_000),
      },
    },
    { runValidators: true },
  );
};
const deferIntegrationSyncJob = async (
  job: IntegrationSyncJobDocument,
  retryAfterSeconds: number,
  now = new Date(),
): Promise<void> => {
  await IntegrationSyncJob.updateOne(
    { _id: job._id, status: 'running', leaseUntil: job.leaseUntil },
    {
      $set: {
        status: 'queued',
        active: true,
        scheduledAt: new Date(now.getTime() + retryAfterSeconds * 1_000),
        leaseUntil: null,
      },
    },
    { runValidators: true },
  );
};

export {
  calculateGitHubSyncSchedule,
  calculateSyncRetryDelay,
  claimIntegrationSyncJob,
  completeIntegrationSyncJob,
  deferIntegrationSyncJob,
  enqueueGitHubSync,
  failIntegrationSyncJob,
};
