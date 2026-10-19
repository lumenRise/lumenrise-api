import log from '../logger';
import launchListIndexes from './20261019LaunchListIndexes';
import launchTeamIndexes from './20261017LaunchTeamIndexes';
import DatabaseMigration from '../models/DatabaseMigration';
import manualXReputation from './20261013ManualXReputation';
import launchHolderIndexes from './20261014LaunchHolderIndexes';
import createCurrentIndexes from './20261012CreateCurrentIndexes';
import type { MigrationDefinition } from '../types/database/migration';
import priceObservationIndexes from './20261014PriceObservationIndexes';
import authProviderAndTokenImageIndexes from './20261012AuthProviderAndTokenImageIndexes';
import stellarNetworkIsolation from './20261019StellarNetworkIsolation';

const migrations: readonly MigrationDefinition[] = [
  authProviderAndTokenImageIndexes,
  createCurrentIndexes,
  manualXReputation,
  priceObservationIndexes,
  launchHolderIndexes,
  launchTeamIndexes,
  launchListIndexes,
  stellarNetworkIsolation,
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
