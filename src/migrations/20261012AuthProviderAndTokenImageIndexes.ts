import TokenImage from '../models/TokenImage';
import type { MigrationDefinition } from '../types/database/migration';

const migration: MigrationDefinition = {
  // Preserve the recorded upgrade name for databases that already applied it.
  name: '20261012-auth-provider-and-token-image-indexes',
  up: async () => {
    let indexes;

    try {
      indexes = await TokenImage.collection.indexes();
    } catch (error) {
      // A new database has no token image collection until the baseline creates it.
      if (error && typeof error === 'object' && 'code' in error && error.code === 26) {
        return;
      }

      throw error;
    }
    if (indexes.some((index) => index.name === 'token_images_asset')) {
      try {
        await TokenImage.collection.dropIndex('token_images_asset');
      } catch (error) {
        // Another application instance may have already removed the same index.
        if (error && typeof error === 'object' && 'code' in error && error.code === 27) {
          return;
        }

        throw error;
      }
    }
  },
};

export default migration;
