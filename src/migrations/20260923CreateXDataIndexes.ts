import XDataSnapshot from '../models/XDataSnapshot';
import type { MigrationDefinition } from '../types/database/migration';
const createXDataIndexes: MigrationDefinition = {
  name: '20260923-create-x-data-indexes',
  up: async () => {
    await XDataSnapshot.createIndexes();
  },
};

export default createXDataIndexes;
