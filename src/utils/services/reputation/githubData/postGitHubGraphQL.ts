import type { GitHubGraphQLResponse } from '../../../../types/reputation/github.js';
import { GITHUB_GRAPHQL_URL } from '../../../../constants/services/reputation/githubData.js';

const postGitHubGraphQL = async <T>(
  accessToken: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> => {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'lumenrise-api',
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = (await response.json()) as GitHubGraphQLResponse<T>;

  if (!response.ok || result.errors?.length || !result.data) {
    throw new Error(result.errors?.[0]?.message ?? 'GitHub GraphQL request failed');
  }

  return result.data;
};

export { postGitHubGraphQL };
