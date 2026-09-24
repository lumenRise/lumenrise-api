import env from '../../../../env.js';
import { requestGitHubToken } from './requestGitHubToken.js';
import { assertGitHubConfiguration } from './assertGitHubConfiguration.js';
import type { GitHubTokenResponse } from '../../../../types/integration/github.js';

const refreshGitHubAccessToken = async (refreshToken: string): Promise<GitHubTokenResponse> => {
  assertGitHubConfiguration();

  const body = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    client_secret: env.GITHUB_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  return requestGitHubToken(body);
};

export { refreshGitHubAccessToken };
