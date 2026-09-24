import Policy from '../models/Policy.js';
import type { MigrationDefinition } from '../types/database/migration.js';

const createPolicyIndexes: MigrationDefinition = {
  name: '20260924-create-policy-indexes',
  up: async () => {
    await Policy.createIndexes();
  },
};

export default createPolicyIndexes;
