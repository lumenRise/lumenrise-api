import ProviderCredential from '../models/ProviderCredential';
import type { MigrationDefinition } from '../types/database/migration';

const createProviderCredentialIndexes: MigrationDefinition = {
  name: '20260922-create-provider-credential-indexes',
  up: async () => {
    await ProviderCredential.createIndexes();
  },
};

export default createProviderCredentialIndexes;
