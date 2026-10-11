import LaunchTrade from '../models/LaunchTrade';
import LaunchPriceSample from '../models/LaunchPriceSample';
import LaunchTradeCursor from '../models/LaunchTradeCursor';
import type { MigrationDefinition } from '../types/database/migration';

const createLaunchMarketIndexes: MigrationDefinition = {
  name: '20261011-create-launch-market-indexes',
  up: async () => {
    await Promise.all([
      LaunchTrade.createIndexes(),
      LaunchPriceSample.createIndexes(),
      LaunchTradeCursor.createIndexes(),
    ]);
  },
};

export default createLaunchMarketIndexes;
