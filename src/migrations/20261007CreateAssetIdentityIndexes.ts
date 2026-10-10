import AssetIdentity from '../models/AssetIdentity';
import type { MigrationDefinition } from '../types/database/migration';

const createAssetIdentityIndexes: MigrationDefinition = {
  // Keep the recorded migration name so databases that ran it do not rerun it.
  name: '20261007-create-home-domain-indexes',
  up: async () => {
    await AssetIdentity.createIndexes();
  },
};

export default createAssetIdentityIndexes;
