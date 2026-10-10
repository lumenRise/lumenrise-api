import TokenImage from '../models/TokenImage';
import type { MigrationDefinition } from '../types/database/migration';

const createTokenImageIndexes: MigrationDefinition = {
  name: '20261009-create-token-image-indexes',
  up: async () => { await TokenImage.createIndexes(); },
};

export default createTokenImageIndexes;
