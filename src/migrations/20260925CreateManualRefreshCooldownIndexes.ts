import ManualRefreshCooldown from '../models/ManualRefreshCooldown';
import type { MigrationDefinition } from '../types/database/migration';

const createManualRefreshCooldownIndexes: MigrationDefinition = {
  name: '20260925-create-manual-refresh-cooldown-indexes',
  up: async () => {
    await ManualRefreshCooldown.createIndexes();
  },
};

export default createManualRefreshCooldownIndexes;
