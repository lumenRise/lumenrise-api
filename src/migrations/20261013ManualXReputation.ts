import XDataSnapshot from '../models/XDataSnapshot';
import ExternalAccount from '../models/ExternalAccount';
import ReputationSnapshot from '../models/ReputationSnapshot';
import { X_SYNC_MIN_INTERVAL_MS } from '../constants/integration';
import ManualRefreshCooldown from '../models/ManualRefreshCooldown';
import type { MigrationDefinition } from '../types/database/migration';

const manualXReputation: MigrationDefinition = {
  name: '20261013-manual-x-reputation',
  up: async () => {
    // Historical snapshot fields are immutable in normal application writes.
    await XDataSnapshot.collection.updateMany({ dataVersion: 'x-data-v2' }, [
      {
        $set: {
          status: 'complete',
          'coverage.connections': true,
          connections: {
            $map: {
              input: { $ifNull: ['$connections', []] },
              as: 'connection',
              in: {
                username: '$$connection.username',
                connectionStatus: { $ifNull: ['$$connection.connectionStatus', []] },
              },
            },
          },
        },
      },
    ]);

    await ReputationSnapshot.collection.updateMany(
      { category: 'social', algorithmVersion: 'social-v2', status: 'partial' },
      { $set: { status: 'complete' } },
    );

    const accounts = ExternalAccount.find({ provider: 'x', lastSyncedAt: { $ne: null } }).cursor();

    for await (const account of accounts) {
      if (!account.lastSyncedAt) {
        continue;
      }

      await ManualRefreshCooldown.updateOne(
        { identity: account.identity, target: 'x-sync' },
        {
          $max: {
            nextAllowedAt: new Date(account.lastSyncedAt.getTime() + X_SYNC_MIN_INTERVAL_MS),
          },
        },
        { upsert: true, runValidators: true },
      );
    }
  },
};

export default manualXReputation;
