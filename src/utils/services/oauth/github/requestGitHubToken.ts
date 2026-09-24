import { GITHUB_TOKEN_URL } from '../../../../constants/services/oauth/github.js';
import type { GitHubTokenResponse } from '../../../../types/integration/github.js';

const requestGitHubToken = async (body: URLSearchParams): Promise<GitHubTokenResponse> => {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const result = (await response.json()) as GitHubTokenResponse;

  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description ?? result.error ?? 'GitHub token exchange failed');
  }

  return result;
};

export { requestGitHubToken };
