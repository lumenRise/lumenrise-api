import Launch from '../models/Launch';
import Policy from '../models/Policy';
import Identity from '../models/Identity';
import BaseCursor from '../models/BaseCursor';
import EvmAccount from '../models/EvmAccount';
import LaunchName from '../models/LaunchName';
import OAuthState from '../models/OAuthState';
import TokenImage from '../models/TokenImage';
import LaunchTrade from '../models/LaunchTrade';
import LaunchHolder from '../models/LaunchHolder';
import AssetIdentity from '../models/AssetIdentity';
import AvatarCleanup from '../models/AvatarCleanup';
import FactoryCursor from '../models/FactoryCursor';
import PrivyIdentity from '../models/PrivyIdentity';
import XDataSnapshot from '../models/XDataSnapshot';
import BaseCheckpoint from '../models/BaseCheckpoint';
import StellarAccount from '../models/StellarAccount';
import DeveloperApiKey from '../models/DeveloperApiKey';
import ExternalAccount from '../models/ExternalAccount';
import LaunchTeamMember from '../models/LaunchTeamMember';
import DeveloperApiUsage from '../models/DeveloperApiUsage';
import LaunchPriceSample from '../models/LaunchPriceSample';
import BaseTransactionJob from '../models/BaseTransactionJob';
import GitHubDataSnapshot from '../models/GitHubDataSnapshot';
import IntegrationSyncJob from '../models/IntegrationSyncJob';
import ProviderCredential from '../models/ProviderCredential';
import ReputationSnapshot from '../models/ReputationSnapshot';
import StellarPaymentFact from '../models/StellarPaymentFact';
import StellarActivityScan from '../models/StellarActivityScan';
import ReputationCleanupJob from '../models/ReputationCleanupJob';
import GitHubRepositoryFact from '../models/GitHubRepositoryFact';
import StellarTransactionJob from '../models/StellarTransactionJob';
import ManualRefreshCooldown from '../models/ManualRefreshCooldown';
import LaunchHolderRefreshJob from '../models/LaunchHolderRefreshJob';
import type { MigrationDefinition } from '../types/database/migration';
import SorobanTransactionEvidence from '../models/SorobanTransactionEvidence';

const createCurrentIndexes: MigrationDefinition = {
  name: '20261012-create-current-indexes',
  up: async (): Promise<void> => {
    await Promise.all([
      AssetIdentity.createIndexes(),
      AvatarCleanup.createIndexes(),
      BaseCheckpoint.createIndexes(),
      BaseCursor.createIndexes(),
      BaseTransactionJob.createIndexes(),
      DeveloperApiKey.createIndexes(),
      DeveloperApiUsage.createIndexes(),
      EvmAccount.createIndexes(),
      ExternalAccount.createIndexes(),
      FactoryCursor.createIndexes(),
      GitHubDataSnapshot.createIndexes(),
      GitHubRepositoryFact.createIndexes(),
      Identity.createIndexes(),
      IntegrationSyncJob.createIndexes(),
      Launch.createIndexes(),
      LaunchHolder.createIndexes(),
      LaunchHolderRefreshJob.createIndexes(),
      LaunchName.createIndexes(),
      LaunchPriceSample.createIndexes(),
      LaunchTeamMember.createIndexes(),
      LaunchTrade.createIndexes(),
      ManualRefreshCooldown.createIndexes(),
      OAuthState.createIndexes(),
      Policy.createIndexes(),
      PrivyIdentity.createIndexes(),
      ProviderCredential.createIndexes(),
      ReputationSnapshot.createIndexes(),
      ReputationCleanupJob.createIndexes(),
      SorobanTransactionEvidence.createIndexes(),
      StellarAccount.createIndexes(),
      StellarActivityScan.createIndexes(),
      StellarPaymentFact.createIndexes(),
      StellarTransactionJob.createIndexes(),
      TokenImage.createIndexes(),
      XDataSnapshot.createIndexes(),
    ]);
  },
};

export default createCurrentIndexes;
