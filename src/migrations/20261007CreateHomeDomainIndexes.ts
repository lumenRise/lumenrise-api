import AssetIdentity from '../models/AssetIdentity';
import HomeDomainCheck from '../models/HomeDomainCheck';
import HomeDomainVerification from '../models/HomeDomainVerification';
import type { MigrationDefinition } from '../types/database/migration';

const createHomeDomainIndexes: MigrationDefinition = {
  name: '20261007-create-home-domain-indexes',
  up: async () => {
    await AssetIdentity.createIndexes();
    await HomeDomainVerification.createIndexes();
    await HomeDomainCheck.createIndexes();
  },
};

export default createHomeDomainIndexes;
