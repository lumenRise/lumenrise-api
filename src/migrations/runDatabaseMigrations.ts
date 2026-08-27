import log from '../logger.js';
import DatabaseMigration from '../models/DatabaseMigration.js';
import createIdentityIndexes from './20260922CreateIdentityIndexes.js';
import type { MigrationDefinition } from '../types/database/migration.js';
import createReputationIndexes from './20260922CreateReputationIndexes.js';
import createExternalAccountIndexes from './20260922CreateExternalAccountIndexes.js';

const migrations: readonly MigrationDefinition[] = [
  createIdentityIndexes,
  createExternalAccountIndexes,
  createReputationIndexes,
];
const runDatabaseMigrations = async (): Promise<void> => {
  await DatabaseMigration.createIndexes();

  for (const migration of migrations) {
    const appliedMigration = await DatabaseMigration.exists({ name: migration.name });

    if (appliedMigration) {
      continue;
    }

    await migration.up();
    await DatabaseMigration.create({ name: migration.name });
    log.info({ migration: migration.name }, 'Database migration applied');
  }
};

export default runDatabaseMigrations;
