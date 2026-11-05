import log from '../logger';
import DatabaseMigration from '../models/DatabaseMigration';
import statsTradeIndexes from './20261101StatsTradeIndexes';
import baseTransactionJobs from './20261104BaseTransactionJobs';
import createCurrentIndexes from './20261012CreateCurrentIndexes';
import reputationCleanupJobs from './20261105ReputationCleanupJobs';
import basePoolHistoryReplay from './20261101BasePoolHistoryReplay';
import stellarTransactionJobs from './20261105StellarTransactionJobs';
import type { MigrationDefinition } from '../types/database/migration';

const migrations: readonly MigrationDefinition[] = [
  createCurrentIndexes,
  statsTradeIndexes,
  basePoolHistoryReplay,
  baseTransactionJobs,
  stellarTransactionJobs,
  reputationCleanupJobs,
];

const runDatabaseMigrations = async (): Promise<void> => {
  await DatabaseMigration.createIndexes();

  for (const migration of migrations) {
    if (await DatabaseMigration.exists({ name: migration.name })) {
      continue;
    }

    await migration.up();

    await DatabaseMigration.updateOne(
      { name: migration.name },
      { $setOnInsert: { name: migration.name, appliedAt: new Date() } },
      { upsert: true },
    );

    log.info({ migration: migration.name }, 'Database migration applied');
  }
};

export default runDatabaseMigrations;
