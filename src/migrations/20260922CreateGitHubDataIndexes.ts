import GitHubDataSnapshot from '../models/GitHubDataSnapshot';
import GitHubRepositoryFact from '../models/GitHubRepositoryFact';
import type { MigrationDefinition } from '../types/database/migration';

const createGitHubDataIndexes: MigrationDefinition = {
  name: '20260922-create-github-data-indexes',
  up: async () => {
    await Promise.all([GitHubDataSnapshot.createIndexes(), GitHubRepositoryFact.createIndexes()]);
  },
};

export default createGitHubDataIndexes;
