import Launch from '../models/Launch';
import type { MigrationDefinition } from '../types/database/migration';

const createLaunchIndexes: MigrationDefinition = {
  name: '20261003-create-launch-indexes',
  up: async () => {
    await Launch.createIndexes();
  },
};

export default createLaunchIndexes;
