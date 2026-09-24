import { postGitHubGraphQL } from './postGitHubGraphQL.js';
import type {
  GitHubRepositoriesQueryData,
  GitHubRepositoryNode,
} from '../../../../types/reputation/github.js';

const collectAllRepositories = async (
  username: string,
  accessToken: string,
): Promise<GitHubRepositoryNode[]> => {
  const query = `
    query GitHubRepositories($login: String!, $after: String) {
      user(login: $login) {
        repositories(
          first: 100
          after: $after
          ownerAffiliations: OWNER
          privacy: PUBLIC
          orderBy: { field: UPDATED_AT, direction: DESC }
        ) {
          nodes {
            databaseId
            nameWithOwner
            isFork
            isArchived
            stargazerCount
            forkCount
            watchers(first: 1) { totalCount }
            issues(first: 1, states: OPEN) { totalCount }
            pullRequests(first: 1, states: MERGED) { totalCount }
            releases(first: 1) { totalCount }
            createdAt
            pushedAt
            primaryLanguage { name }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  `;

  const repositories: GitHubRepositoryNode[] = [];

  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data: GitHubRepositoriesQueryData = await postGitHubGraphQL(accessToken, query, {
      login: username,
      after,
    });

    if (!data.user) {
      throw new Error('GitHub user was not found while collecting repositories');
    }

    repositories.push(...data.user.repositories.nodes);
    hasNextPage = data.user.repositories.pageInfo.hasNextPage;
    after = data.user.repositories.pageInfo.endCursor;
  }

  return repositories;
};

export { collectAllRepositories };
