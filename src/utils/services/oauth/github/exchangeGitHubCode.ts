import env from '../../../../env';
import { requestGitHubToken } from './requestGitHubToken';
import type { GitHubTokenResponse } from '../../../../types/integration/github';

const exchangeGitHubCode = async (
  code: string,
  codeVerifier: string,
): Promise<GitHubTokenResponse> => {
  const body = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    client_secret: env.GITHUB_CLIENT_SECRET,
    code,
    redirect_uri: env.GITHUB_CALLBACK_URL,
    code_verifier: codeVerifier,
  });

  return requestGitHubToken(body);
};

export { exchangeGitHubCode };
