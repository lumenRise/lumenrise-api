import Identity from '../models/Identity';
import StellarAccount from '../models/StellarAccount';
import type { MigrationDefinition } from '../types/database/migration';
const createIdentityIndexes: MigrationDefinition = {
  name: '20260922-create-identity-indexes',
  up: async () => {
    await Promise.all([Identity.createIndexes(), StellarAccount.createIndexes()]);
  },
};

export default createIdentityIndexes;
