import Launch from '../models/Launch';
import Policy from '../models/Policy';
import Identity from '../models/Identity';
import TokenImage from '../models/TokenImage';
import OAuthState from '../models/OAuthState';
import LaunchTrade from '../models/LaunchTrade';
import XDataSnapshot from '../models/XDataSnapshot';
import AvatarCleanup from '../models/AvatarCleanup';
import AssetIdentity from '../models/AssetIdentity';
import StellarAccount from '../models/StellarAccount';
import DeveloperApiKey from '../models/DeveloperApiKey';
import ExternalAccount from '../models/ExternalAccount';
import LaunchPriceSample from '../models/LaunchPriceSample';
import DeveloperApiUsage from '../models/DeveloperApiUsage';
import LaunchTradeCursor from '../models/LaunchTradeCursor';
import GitHubDataSnapshot from '../models/GitHubDataSnapshot';
import ProviderCredential from '../models/ProviderCredential';
import StellarPaymentFact from '../models/StellarPaymentFact';
import ReputationSnapshot from '../models/ReputationSnapshot';
import IntegrationSyncJob from '../models/IntegrationSyncJob';
import StellarActivityScan from '../models/StellarActivityScan';
import GitHubRepositoryFact from '../models/GitHubRepositoryFact';
import ManualRefreshCooldown from '../models/ManualRefreshCooldown';
import type { MigrationDefinition } from '../types/database/migration';
import SorobanTransactionEvidence from '../models/SorobanTransactionEvidence';

const createCurrentIndexes: MigrationDefinition = {
  name: '20261012-create-current-indexes',
  up: async () => {
    await Promise.all([
      AssetIdentity.createIndexes(),
      AvatarCleanup.createIndexes(),
      DeveloperApiKey.createIndexes(),
      DeveloperApiUsage.createIndexes(),
      ExternalAccount.createIndexes(),
      GitHubDataSnapshot.createIndexes(),
      GitHubRepositoryFact.createIndexes(),
      Identity.createIndexes(),
      IntegrationSyncJob.createIndexes(),
      Launch.createIndexes(),
      LaunchPriceSample.createIndexes(),
      LaunchTrade.createIndexes(),
      LaunchTradeCursor.createIndexes(),
      ManualRefreshCooldown.createIndexes(),
      OAuthState.createIndexes(),
      Policy.createIndexes(),
      ProviderCredential.createIndexes(),
      ReputationSnapshot.createIndexes(),
      SorobanTransactionEvidence.createIndexes(),
      StellarAccount.createIndexes(),
      StellarActivityScan.createIndexes(),
      StellarPaymentFact.createIndexes(),
      TokenImage.createIndexes(),
      XDataSnapshot.createIndexes(),
    ]);
  },
};

export default createCurrentIndexes;
