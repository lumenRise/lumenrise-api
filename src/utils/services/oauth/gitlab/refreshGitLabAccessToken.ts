import env from '../../../../env.js';
import { requestGitLabToken } from './requestGitLabToken.js';
import { assertGitLabConfiguration } from './assertGitLabConfiguration.js';
import type { GitLabTokenResponse } from '../../../../types/integration/gitlab.js';

const refreshGitLabAccessToken = async (refreshToken: string): Promise<GitLabTokenResponse> => {
  assertGitLabConfiguration();

  const body = new URLSearchParams({
    client_id: env.GITLAB_CLIENT_ID,
    client_secret: env.GITLAB_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    redirect_uri: env.GITLAB_CALLBACK_URL,
  });

  return requestGitLabToken(body);
};

export { refreshGitLabAccessToken };
