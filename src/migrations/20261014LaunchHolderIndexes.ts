import LaunchHolder from '../models/LaunchHolder';
import LaunchHolderRefreshJob from '../models/LaunchHolderRefreshJob';
import type { MigrationDefinition } from '../types/database/migration';

const launchHolderIndexes: MigrationDefinition = {
  name: '20261014-launch-holder-indexes',
  up: async () => {
    await Promise.all([LaunchHolder.createIndexes(), LaunchHolderRefreshJob.createIndexes()]);
  },
};

export default launchHolderIndexes;
