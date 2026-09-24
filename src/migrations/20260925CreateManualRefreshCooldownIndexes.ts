import ManualRefreshCooldown from '../models/ManualRefreshCooldown.js';
import type { MigrationDefinition } from '../types/database/migration.js';

const createManualRefreshCooldownIndexes: MigrationDefinition = {
  name: '20260925-create-manual-refresh-cooldown-indexes',
  up: async () => {
    await ManualRefreshCooldown.createIndexes();
  },
};

export default createManualRefreshCooldownIndexes;
