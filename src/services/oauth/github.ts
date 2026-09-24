import { createHash } from 'node:crypto';

import { issueSession } from '../auth/session.js';
import OAuthState from '../../models/OAuthState.js';
import type { IssuedSession } from '../../types/auth/model.js';
import { enqueueGitHubSync } from '../integration/syncQueue.js';
import type { CompletedGitHubOAuth } from '../../types/integration/github.js';
import { storeProviderCredential } from '../integration/providerCredential.js';
import { exchangeGitHubCode } from '../../utils/services/oauth/github/exchangeGitHubCode.js';
import { connectGitHubAccount } from '../../utils/services/oauth/github/connectGitHubAccount.js';
import { revokeGitHubAccessToken } from '../../utils/services/oauth/github/revokeGitHubAccessToken.js';
import { refreshGitHubAccessToken } from '../../utils/services/oauth/github/refreshGitHubAccessToken.js';
import { createGitHubAuthorization } from '../../utils/services/oauth/github/createGitHubAuthorization.js';
import { assertGitHubConfiguration } from '../../utils/services/oauth/github/assertGitHubConfiguration.js';
import { getAuthenticatedGitHubUser } from '../../utils/services/oauth/github/getAuthenticatedGitHubUser.js';
import {
  OAUTH_STATE_TTL_MS,
  GITHUB_AUTHORIZE_URL,
  GITHUB_API_VERSION,
  GITHUB_USER_API_URL,
  GITHUB_TOKEN_URL,
  GITHUB_APPLICATIONS_API_URL,
} from '../../constants/services/oauth/github.js';

const completeGitHubAuthorization = async (
  code: string,
  state: string,
): Promise<{ connection: CompletedGitHubOAuth; session: IssuedSession }> => {
  assertGitHubConfiguration();

  const stateHash = createHash('sha256').update(state).digest('hex');
  const oauthState = await OAuthState.findOneAndUpdate(
    {
      provider: 'github',
      stateHash,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { consumedAt: new Date() } },
    { returnDocument: 'after' },
  ).select('+codeVerifier');

  if (!oauthState) {
    throw new Error('Invalid or expired OAuth state');
  }

  if (oauthState.purpose !== 'connect' || !oauthState.identity) {
    throw new Error('Wallet registration is required before connecting GitHub');
  }

  const token = await exchangeGitHubCode(code, oauthState.codeVerifier);
  const accessToken = token.access_token as string;
  const user = await getAuthenticatedGitHubUser(accessToken);
  const account = await connectGitHubAccount(user, oauthState.purpose, oauthState.identity);

  await storeProviderCredential(account.externalAccount._id, 'github', {
    accessToken,
    refreshToken: token.refresh_token ?? null,
    accessTokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1_000) : null,
    refreshTokenExpiresAt: token.refresh_token_expires_in
      ? new Date(Date.now() + token.refresh_token_expires_in * 1_000)
      : null,
  });

  const syncJob = await enqueueGitHubSync(account.externalAccount);
  const session = await issueSession(account.identityId);

  return {
    connection: {
      identityId: account.identityId.toString(),
      username: user.login,
      syncJobId: syncJob._id.toString(),
    },
    session,
  };
};

export {
  completeGitHubAuthorization,
  createGitHubAuthorization,
  getAuthenticatedGitHubUser,
  refreshGitHubAccessToken,
  revokeGitHubAccessToken,
};

export {
  OAUTH_STATE_TTL_MS,
  GITHUB_AUTHORIZE_URL,
  GITHUB_TOKEN_URL,
  GITHUB_API_VERSION,
  GITHUB_APPLICATIONS_API_URL,
  GITHUB_USER_API_URL,
};
