import OAuthState from '../models/OAuthState';
import ExternalAccount from '../models/ExternalAccount';
import type { MigrationDefinition } from '../types/database/migration';
const createExternalAccountIndexes: MigrationDefinition = {
  name: '20260922-create-external-account-indexes',
  up: async () => {
    await Promise.all([OAuthState.createIndexes(), ExternalAccount.createIndexes()]);
  },
};

export default createExternalAccountIndexes;
