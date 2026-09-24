import env from '../../../../env.js';
import { getGitLabUrl } from './getGitLabUrl.js';
import { assertGitLabConfiguration } from './assertGitLabConfiguration.js';

const revokeGitLabAccessToken = async (accessToken: string): Promise<void> => {
  assertGitLabConfiguration();

  const body = new URLSearchParams({
    client_id: env.GITLAB_CLIENT_ID,
    client_secret: env.GITLAB_CLIENT_SECRET,
    token: accessToken,
  });

  const response = await fetch(getGitLabUrl('/oauth/revoke'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`GitLab token revocation failed with status ${response.status}`);
  }
};

export { revokeGitLabAccessToken };
