import env from '../../../../env.js';
import { requestGitLabToken } from './requestGitLabToken.js';
import type { GitLabTokenResponse } from '../../../../types/integration/gitlab.js';

const exchangeGitLabCode = async (
  code: string,
  codeVerifier: string,
): Promise<GitLabTokenResponse> => {
  const body = new URLSearchParams({
    client_id: env.GITLAB_CLIENT_ID,
    client_secret: env.GITLAB_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: env.GITLAB_CALLBACK_URL,
    code_verifier: codeVerifier,
  });

  return requestGitLabToken(body);
};

export { exchangeGitLabCode };
