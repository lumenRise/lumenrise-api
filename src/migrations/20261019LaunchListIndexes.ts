import Launch from '../models/Launch';
import type { MigrationDefinition } from '../types/database/migration';

const launchListIndexes: MigrationDefinition = {
  name: '20261019-launch-list-indexes',
  up: async (): Promise<void> => {
    await Launch.createIndexes();
  },
};

export default launchListIndexes;
