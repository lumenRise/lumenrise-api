import TokenImage from '../models/TokenImage';
import type { MigrationDefinition } from '../types/database/migration';

const createTokenImageCleanupIndex: MigrationDefinition = {
  name: '20261010-create-token-image-cleanup-index',
  up: async () => {
    await TokenImage.createIndexes();
  },
};

export default createTokenImageCleanupIndex;
