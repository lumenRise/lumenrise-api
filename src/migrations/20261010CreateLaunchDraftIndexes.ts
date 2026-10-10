import LaunchDraft from '../models/LaunchDraft';
import type { MigrationDefinition } from '../types/database/migration';

const createLaunchDraftIndexes: MigrationDefinition = {
  name: '20261010-create-launch-draft-indexes',
  up: async () => {
    await LaunchDraft.createIndexes();
  },
};

export default createLaunchDraftIndexes;
