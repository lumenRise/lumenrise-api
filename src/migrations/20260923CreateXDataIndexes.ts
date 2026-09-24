import XDataSnapshot from '../models/XDataSnapshot.js';
import type { MigrationDefinition } from '../types/database/migration.js';

const createXDataIndexes: MigrationDefinition = {
  name: '20260923-create-x-data-indexes',
  up: async () => {
    await XDataSnapshot.createIndexes();
  },
};

export default createXDataIndexes;
