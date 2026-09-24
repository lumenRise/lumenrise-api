import log from '../logger.js';
import DatabaseMigration from '../models/DatabaseMigration.js';
import createXDataIndexes from './20260923CreateXDataIndexes.js';
import createSessionIndexes from './20260922CreateSessionIndexes.js';
import createIdentityIndexes from './20260922CreateIdentityIndexes.js';
import type { MigrationDefinition } from '../types/database/migration.js';
import createGitHubDataIndexes from './20260922CreateGitHubDataIndexes.js';
import createGitLabDataIndexes from './20260923CreateGitLabDataIndexes.js';
import createReputationIndexes from './20260922CreateReputationIndexes.js';
import createExternalAccountIndexes from './20260922CreateExternalAccountIndexes.js';
import createProviderCredentialIndexes from './20260922CreateProviderCredentialIndexes.js';
import createIntegrationSyncJobIndexes from './20260922CreateIntegrationSyncJobIndexes.js';
import createStellarActivityScanIndexes from './20260924CreateStellarActivityScanIndexes.js';
import createWalletAuthChallengeIndexes from './20260924CreateWalletAuthChallengeIndexes.js';

const migrations: readonly MigrationDefinition[] = [
  createIdentityIndexes,
  createExternalAccountIndexes,
  createReputationIndexes,
  createSessionIndexes,
  createGitHubDataIndexes,
  createGitLabDataIndexes,
  createXDataIndexes,
  createProviderCredentialIndexes,
  createIntegrationSyncJobIndexes,
  createStellarActivityScanIndexes,
  createWalletAuthChallengeIndexes,
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
