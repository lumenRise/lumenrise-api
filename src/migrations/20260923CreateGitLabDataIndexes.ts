import GitLabEventFact from '../models/GitLabEventFact.js';
import GitLabProjectFact from '../models/GitLabProjectFact.js';
import GitLabDataSnapshot from '../models/GitLabDataSnapshot.js';
import type { MigrationDefinition } from '../types/database/migration.js';

const createGitLabDataIndexes: MigrationDefinition = {
  name: '20260923-create-gitlab-data-indexes',
  up: async () => {
    await Promise.all([
      GitLabDataSnapshot.createIndexes(),
      GitLabProjectFact.createIndexes(),
      GitLabEventFact.createIndexes(),
    ]);
  },
};

export default createGitLabDataIndexes;
