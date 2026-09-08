import ProviderCredential from '../models/ProviderCredential.js';
import type { MigrationDefinition } from '../types/database/migration.js';

const createProviderCredentialIndexes: MigrationDefinition = {
  name: '20260922-create-provider-credential-indexes',
  up: async () => {
    await ProviderCredential.createIndexes();
  },
};

export default createProviderCredentialIndexes;
