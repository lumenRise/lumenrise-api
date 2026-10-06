import log from '../logger';
import DatabaseMigration from '../models/DatabaseMigration';
import createXDataIndexes from './20260923CreateXDataIndexes';
import createLaunchIndexes from './20261003CreateLaunchIndexes';
import createPolicyIndexes from './20260924CreatePolicyIndexes';
import createSessionIndexes from './20260922CreateSessionIndexes';
import createIdentityIndexes from './20260922CreateIdentityIndexes';
import type { MigrationDefinition } from '../types/database/migration';
import createGitHubDataIndexes from './20260922CreateGitHubDataIndexes';
import createReputationIndexes from './20260922CreateReputationIndexes';
import createDeveloperApiIndexes from './20260925CreateDeveloperApiIndexes';
import createSorobanEvidenceIndexes from './20260926CreateSorobanEvidenceIndexes';
import createExternalAccountIndexes from './20260922CreateExternalAccountIndexes';
import createProviderCredentialIndexes from './20260922CreateProviderCredentialIndexes';
import createIntegrationSyncJobIndexes from './20260922CreateIntegrationSyncJobIndexes';
import createStellarPaymentFactIndexes from './20260925CreateStellarPaymentFactIndexes';
import createStellarActivityScanIndexes from './20260924CreateStellarActivityScanIndexes';
import createWalletAuthChallengeIndexes from './20260924CreateWalletAuthChallengeIndexes';
import createManualRefreshCooldownIndexes from './20260925CreateManualRefreshCooldownIndexes';

const migrations: readonly MigrationDefinition[] = [
  createIdentityIndexes,
  createExternalAccountIndexes,
  createReputationIndexes,
  createSessionIndexes,
  createGitHubDataIndexes,
  createXDataIndexes,
  createProviderCredentialIndexes,
  createIntegrationSyncJobIndexes,
  createStellarActivityScanIndexes,
  createWalletAuthChallengeIndexes,
  createPolicyIndexes,
  createManualRefreshCooldownIndexes,
  createStellarPaymentFactIndexes,
  createDeveloperApiIndexes,
  createSorobanEvidenceIndexes,
  createLaunchIndexes,
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
