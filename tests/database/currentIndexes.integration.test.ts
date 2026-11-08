import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import Launch from '../../src/models/Launch';
import EvmAccount from '../../src/models/EvmAccount';
import LaunchTrade from '../../src/models/LaunchTrade';
import LaunchTeamMember from '../../src/models/LaunchTeamMember';
import BaseTransactionJob from '../../src/models/BaseTransactionJob';
import ReputationCleanupJob from '../../src/models/ReputationCleanupJob';
import StellarTransactionJob from '../../src/models/StellarTransactionJob';
import createCurrentIndexes from '../../src/migrations/20261012CreateCurrentIndexes';

const databaseName = `current_indexes_${randomUUID().replaceAll('-', '')}`;

describe.runIf(Boolean(process.env.LUMENRISE_TEST_DB_URI))(
  'consolidated current indexes',
  (): void => {
    beforeAll(async (): Promise<void> => {
      mongoose.set('autoIndex', false);

      await mongoose.connect(process.env.LUMENRISE_TEST_DB_URI!, {
        dbName: databaseName,
        serverSelectionTimeoutMS: 5000,
      });
    });

    afterAll(async (): Promise<void> => {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    });

    it('installs current indexes including those from the removed migrations on a fresh database', async (): Promise<void> => {
      await createCurrentIndexes.up();

      expect(createCurrentIndexes.name).toBe('20261012-create-current-indexes');

      expect((await EvmAccount.collection.indexes()).length).toBeGreaterThan(1);

      expect((await LaunchTeamMember.collection.indexes()).length).toBeGreaterThan(1);

      expect(
        (await Launch.collection.indexes()).map(
          (index: { name?: string }): string | undefined => index.name,
        ),
      ).toContain('launches_base_pool_lookup');

      expect(
        (await LaunchTrade.collection.indexes()).map(
          (index: { name?: string }): string | undefined => index.name,
        ),
      ).toEqual(
        expect.arrayContaining([
          'launch_trades_stats_chain_time',
          'launch_trades_stats_network_time',
        ]),
      );

      expect(
        (await BaseTransactionJob.collection.indexes()).map(
          (index: { name?: string }): string | undefined => index.name,
        ),
      ).toEqual(
        expect.arrayContaining(['base_transaction_job_unique', 'base_transaction_job_pending']),
      );

      expect(
        (await StellarTransactionJob.collection.indexes()).map(
          (index: { name?: string }): string | undefined => index.name,
        ),
      ).toEqual(
        expect.arrayContaining([
          'stellar_transaction_job_unique',
          'stellar_transaction_job_pending',
        ]),
      );

      expect(
        (await ReputationCleanupJob.collection.indexes()).map(
          (index: { name?: string }): string | undefined => index.name,
        ),
      ).toEqual(
        expect.arrayContaining(['reputation_cleanup_account_cutoff', 'reputation_cleanup_due']),
      );
    });
  },
);
