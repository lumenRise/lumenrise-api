import log from '../logger';
import DatabaseMigration from '../models/DatabaseMigration';
import statsTradeIndexes from './20261101StatsTradeIndexes';
import createCurrentIndexes from './20261012CreateCurrentIndexes';
import basePoolHistoryReplay from './20261101BasePoolHistoryReplay';
import type { MigrationDefinition } from '../types/database/migration';

const migrations: readonly MigrationDefinition[] = [
  createCurrentIndexes,
  statsTradeIndexes,
  basePoolHistoryReplay,
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
