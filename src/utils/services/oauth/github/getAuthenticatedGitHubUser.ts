import type { GitHubUser } from '../../../../types/integration/github.js';
import { GITHUB_API_VERSION } from '../../../../constants/services/oauth/github.js';
import { GITHUB_USER_API_URL } from '../../../../constants/services/oauth/github.js';

const getAuthenticatedGitHubUser = async (accessToken: string): Promise<GitHubUser> => {
  const response = await fetch(GITHUB_USER_API_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'lumenrise-api',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
    },
  });

  if (!response.ok) {
    throw new Error('GitHub user lookup failed');
  }

  return (await response.json()) as GitHubUser;
};

export { getAuthenticatedGitHubUser };
