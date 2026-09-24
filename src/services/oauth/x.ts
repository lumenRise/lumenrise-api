import { createHash } from 'node:crypto';

import { issueSession } from '../auth/session.js';
import OAuthState from '../../models/OAuthState.js';
import { enqueueXSync } from '../integration/syncQueue.js';
import type { IssuedSession } from '../../types/auth/model.js';
import type { CompletedXOAuth } from '../../types/integration/x.js';
import { exchangeXCode } from '../../utils/services/oauth/x/exchangeXCode.js';
import { storeProviderCredential } from '../integration/providerCredential.js';
import { connectXAccount } from '../../utils/services/oauth/x/connectXAccount.js';
import { revokeXAccessToken } from '../../utils/services/oauth/x/revokeXAccessToken.js';
import { refreshXAccessToken } from '../../utils/services/oauth/x/refreshXAccessToken.js';
import { createXAuthorization } from '../../utils/services/oauth/x/createXAuthorization.js';
import { assertXConfiguration } from '../../utils/services/oauth/x/assertXConfiguration.js';
import { getAuthenticatedXUser } from '../../utils/services/oauth/x/getAuthenticatedXUser.js';
import {
  X_AUTHORIZE_URL,
  OAUTH_STATE_TTL_MS,
  X_AUTHENTICATED_USER_URL,
  X_TOKEN_URL,
  X_REVOKE_URL,
} from '../../constants/services/oauth/x.js';

const completeXAuthorization = async (
  code: string,
  state: string,
): Promise<{ connection: CompletedXOAuth; session: IssuedSession }> => {
  assertXConfiguration();

  const stateHash = createHash('sha256').update(state).digest('hex');

  const oauthState = await OAuthState.findOneAndUpdate(
    {
      provider: 'x',
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
    throw new Error('Wallet registration is required before connecting X');
  }

  const token = await exchangeXCode(code, oauthState.codeVerifier);
  const accessToken = token.access_token as string;
  const user = await getAuthenticatedXUser(accessToken);
  const account = await connectXAccount(user, oauthState.purpose, oauthState.identity);

  await storeProviderCredential(account.externalAccount._id, 'x', {
    accessToken,
    refreshToken: token.refresh_token ?? null,
    accessTokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1_000) : null,
    refreshTokenExpiresAt: null,
  });

  const syncJob = await enqueueXSync(account.externalAccount);
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
  completeXAuthorization,
  createXAuthorization,
  getAuthenticatedXUser,
  refreshXAccessToken,
  revokeXAccessToken,
};

export { OAUTH_STATE_TTL_MS, X_AUTHORIZE_URL, X_TOKEN_URL, X_REVOKE_URL, X_AUTHENTICATED_USER_URL };
