import AvatarCleanup from '../models/AvatarCleanup';
import type { MigrationDefinition } from '../types/database/migration';

const createAvatarCleanupIndexes: MigrationDefinition = {
  name: '20261008-create-avatar-cleanup-indexes',
  up: async () => {
    await AvatarCleanup.createIndexes();
  },
};

export default createAvatarCleanupIndexes;
