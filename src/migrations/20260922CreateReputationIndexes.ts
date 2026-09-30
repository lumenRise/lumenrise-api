import ReputationSnapshot from '../models/ReputationSnapshot';
import type { MigrationDefinition } from '../types/database/migration';
const createReputationIndexes: MigrationDefinition = {
  name: '20260922-create-reputation-indexes',
  up: async () => {
    await ReputationSnapshot.createIndexes();
  },
};

export default createReputationIndexes;
