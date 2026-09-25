import DeveloperApiKey from '../models/DeveloperApiKey.js';
import DeveloperApiUsage from '../models/DeveloperApiUsage.js';
import type { MigrationDefinition } from '../types/database/migration.js';

const createDeveloperApiIndexes: MigrationDefinition = {
  name: '20260925-create-developer-api-indexes',
  up: async () => {
    await DeveloperApiKey.createIndexes();
    await DeveloperApiUsage.createIndexes();
  },
};

export default createDeveloperApiIndexes;
