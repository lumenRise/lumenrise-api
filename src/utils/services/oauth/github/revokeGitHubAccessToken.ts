import env from '../../../../env.js';
import { assertGitHubConfiguration } from './assertGitHubConfiguration.js';
import { GITHUB_API_VERSION } from '../../../../constants/services/oauth/github.js';
import { GITHUB_APPLICATIONS_API_URL } from '../../../../constants/services/oauth/github.js';

const revokeGitHubAccessToken = async (accessToken: string): Promise<void> => {
  assertGitHubConfiguration();

  const authorization = Buffer.from(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`).toString(
    'base64',
  );

  const response = await fetch(
    `${GITHUB_APPLICATIONS_API_URL}/${encodeURIComponent(env.GITHUB_CLIENT_ID)}/token`,
    {
      method: 'DELETE',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Basic ${authorization}`,
        'Content-Type': 'application/json',
        'User-Agent': 'lumenrise-api',
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
      body: JSON.stringify({ access_token: accessToken }),
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub token revocation failed with status ${response.status}`);
  }
};

export { revokeGitHubAccessToken };
