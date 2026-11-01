import Launch from '../models/Launch';
import LaunchTrade from '../models/LaunchTrade';
import type { MigrationDefinition } from '../types/database/migration';

const statsTradeIndexes: MigrationDefinition = {
  name: '20261101-stats-trade-indexes',
  up: async (): Promise<void> => {
    await Promise.all([LaunchTrade.createIndexes(), Launch.createIndexes()]);
  },
};

export default statsTradeIndexes;
