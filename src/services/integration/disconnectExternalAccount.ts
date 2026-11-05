import mongoose, { type Types } from 'mongoose';

import ExternalAccount from '../../models/ExternalAccount';
import IntegrationSyncJob from '../../models/IntegrationSyncJob';
import ReputationCleanupJob from '../../models/ReputationCleanupJob';
import type { ExternalAccountProvider } from '../../types/integration/model';
import type { DisconnectedAccount } from '../../types/integration/disconnection';

const disconnectExternalAccount = async (
  identity: Types.ObjectId,
  provider: ExternalAccountProvider,
  cutoff: Date,
): Promise<DisconnectedAccount | null> => {
  return mongoose.connection.transaction(async (session): Promise<DisconnectedAccount | null> => {
    const account = await ExternalAccount.findOneAndUpdate(
      { identity, provider, status: 'connected' },
      {
        $set: {
          status: 'disconnected',
          syncLeaseUntil: null,
          disconnectedAt: cutoff,
          ...(provider === 'x' ? { lastSyncedAt: null } : {}),
        },
      },
      { session, runValidators: true, returnDocument: 'after' },
    );

    if (!account) {
      return null;
    }

    await IntegrationSyncJob.updateMany(
      { externalAccount: account._id, active: true },
      {
        $set: {
          status: 'cancelled',
          active: false,
          completedAt: cutoff,
          leaseUntil: null,
          lastError: 'Connection was disconnected',
        },
      },
      { session, runValidators: true },
    );

    const job = await ReputationCleanupJob.findOneAndUpdate(
      { externalAccount: account._id, cutoff },
      {
        $setOnInsert: {
          identity,
          externalAccount: account._id,
          provider,
          cutoff,
          status: 'queued',
          scheduledAt: cutoff,
        },
      },
      { session, upsert: true, returnDocument: 'after' },
    );

    if (!job) {
      throw new Error('Account cleanup could not be accepted');
    }

    return { account, cleanupJobId: job._id.toString() };
  });
};

export default disconnectExternalAccount;
