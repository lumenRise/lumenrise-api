import OAuthState from '../models/OAuthState.js';
import ExternalAccount from '../models/ExternalAccount.js';
import type { MigrationDefinition } from '../types/database/migration.js';

const createExternalAccountIndexes: MigrationDefinition = {
  name: '20260922-create-external-account-indexes',
  up: async () => {
    await Promise.all([OAuthState.createIndexes(), ExternalAccount.createIndexes()]);
  },
};

export default createExternalAccountIndexes;
