import Identity from '../models/Identity.js';
import StellarAccount from '../models/StellarAccount.js';
import type { MigrationDefinition } from '../types/database/migration.js';

const createIdentityIndexes: MigrationDefinition = {
  name: '20260922-create-identity-indexes',
  up: async () => {
    await Promise.all([Identity.createIndexes(), StellarAccount.createIndexes()]);
  },
};

export default createIdentityIndexes;
