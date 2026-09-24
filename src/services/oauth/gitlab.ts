import { createHash } from 'node:crypto';

import { issueSession } from '../auth/session.js';
import OAuthState from '../../models/OAuthState.js';
import type { IssuedSession } from '../../types/auth/model.js';
import { enqueueGitLabSync } from '../integration/syncQueue.js';
import type { CompletedGitLabOAuth } from '../../types/integration/gitlab.js';
import { OAUTH_STATE_TTL_MS } from '../../constants/services/oauth/gitlab.js';
import { storeProviderCredential } from '../integration/providerCredential.js';
import { exchangeGitLabCode } from '../../utils/services/oauth/gitlab/exchangeGitLabCode.js';
import { connectGitLabAccount } from '../../utils/services/oauth/gitlab/connectGitLabAccount.js';
import { revokeGitLabAccessToken } from '../../utils/services/oauth/gitlab/revokeGitLabAccessToken.js';
import { refreshGitLabAccessToken } from '../../utils/services/oauth/gitlab/refreshGitLabAccessToken.js';
import { createGitLabAuthorization } from '../../utils/services/oauth/gitlab/createGitLabAuthorization.js';
import { assertGitLabConfiguration } from '../../utils/services/oauth/gitlab/assertGitLabConfiguration.js';
import { getAuthenticatedGitLabUser } from '../../utils/services/oauth/gitlab/getAuthenticatedGitLabUser.js';

const completeGitLabAuthorization = async (
  code: string,
  state: string,
): Promise<{ connection: CompletedGitLabOAuth; session: IssuedSession }> => {
  assertGitLabConfiguration();

  const stateHash = createHash('sha256').update(state).digest('hex');

  const oauthState = await OAuthState.findOneAndUpdate(
    {
      provider: 'gitlab',
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
    throw new Error('Wallet registration is required before connecting GitLab');
  }

  const token = await exchangeGitLabCode(code, oauthState.codeVerifier);
  const accessToken = token.access_token as string;
  const user = await getAuthenticatedGitLabUser(accessToken);
  const account = await connectGitLabAccount(user, oauthState.purpose, oauthState.identity);

  await storeProviderCredential(account.externalAccount._id, 'gitlab', {
    accessToken,
    refreshToken: token.refresh_token ?? null,
    accessTokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1_000) : null,
    refreshTokenExpiresAt: null,
  });

  const syncJob = await enqueueGitLabSync(account.externalAccount);
  const session = await issueSession(account.identityId);

  return {
    connection: {
      identityId: account.identityId.toString(),
      username: user.username,
      syncJobId: syncJob._id.toString(),
    },
    session,
  };
};

export {
  completeGitLabAuthorization,
  createGitLabAuthorization,
  getAuthenticatedGitLabUser,
  refreshGitLabAccessToken,
  revokeGitLabAccessToken,
};

export { OAUTH_STATE_TTL_MS };
