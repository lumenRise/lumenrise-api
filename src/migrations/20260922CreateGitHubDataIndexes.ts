import GitHubDataSnapshot from '../models/GitHubDataSnapshot.js';
import GitHubRepositoryFact from '../models/GitHubRepositoryFact.js';
import type { MigrationDefinition } from '../types/database/migration.js';

const createGitHubDataIndexes: MigrationDefinition = {
  name: '20260922-create-github-data-indexes',
  up: async () => {
    await Promise.all([GitHubDataSnapshot.createIndexes(), GitHubRepositoryFact.createIndexes()]);
  },
};

export default createGitHubDataIndexes;
