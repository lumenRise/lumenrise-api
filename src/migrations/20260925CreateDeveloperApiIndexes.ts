import DeveloperApiKey from '../models/DeveloperApiKey';
import DeveloperApiUsage from '../models/DeveloperApiUsage';
import type { MigrationDefinition } from '../types/database/migration';

const createDeveloperApiIndexes: MigrationDefinition = {
  name: '20260925-create-developer-api-indexes',
  up: async () => {
    await DeveloperApiKey.createIndexes();
    await DeveloperApiUsage.createIndexes();
  },
};

export default createDeveloperApiIndexes;
