import Launch from '../models/Launch';
import BaseCursor from '../models/BaseCursor';
import LaunchName from '../models/LaunchName';
import TokenImage from '../models/TokenImage';
import EvmAccount from '../models/EvmAccount';
import LaunchTrade from '../models/LaunchTrade';
import LaunchHolder from '../models/LaunchHolder';
import FactoryCursor from '../models/FactoryCursor';
import PrivyIdentity from '../models/PrivyIdentity';
import BaseCheckpoint from '../models/BaseCheckpoint';
import LaunchTeamMember from '../models/LaunchTeamMember';
import LaunchPriceSample from '../models/LaunchPriceSample';
import LaunchHolderRefreshJob from '../models/LaunchHolderRefreshJob';
import type { MigrationDefinition } from '../types/database/migration';

const launchChainIsolation: MigrationDefinition = {
  name: '20261028-launch-chain-isolation',
  up: async (): Promise<void> => {
    const models = [
      Launch,
      LaunchName,
      TokenImage,
      LaunchTrade,
      LaunchHolder,
      FactoryCursor,
      LaunchPriceSample,
      LaunchTeamMember,
      LaunchHolderRefreshJob,
    ];

    for (const model of models) {
      await model.collection.updateMany(
        { chain: { $exists: false } },
        { $set: { chain: 'stellar' } },
      );

      // Build replacements before dropping legacy constraints. Reruns preserve Base data.
      await model.createIndexes();

      const indexes = await model.collection.indexes();

      for (const [keys, options] of model.schema.indexes()) {
        if (!('chain' in keys) || !options.name?.endsWith('_chain')) {
          continue;
        }

        const legacyName = options.name.slice(0, -6);
        const legacy = indexes.find((index) => index.name === legacyName);

        if (legacy && !('chain' in legacy.key)) {
          try {
            await model.collection.dropIndex(legacyName);
          } catch (error) {
            if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 27) {
              throw error;
            }
          }
        }
      }
    }

    await BaseCursor.createIndexes();

    await BaseCheckpoint.createIndexes();

    await EvmAccount.createIndexes();

    await PrivyIdentity.createIndexes();
  },
};

export default launchChainIsolation;
