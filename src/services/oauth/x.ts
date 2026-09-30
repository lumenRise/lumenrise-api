import { createHash } from 'node:crypto';

import { issueSession } from '../auth/session';
import OAuthState from '../../models/OAuthState';
import { enqueueXSync } from '../integration/syncQueue';
import type { IssuedSession } from '../../types/auth/model';
import type { CompletedXOAuth } from '../../types/integration/x';
import { exchangeXCode } from '../../utils/services/oauth/x/exchangeXCode';
import { storeProviderCredential } from '../integration/providerCredential';
import { connectXAccount } from '../../utils/services/oauth/x/connectXAccount';
import { revokeXAccessToken } from '../../utils/services/oauth/x/revokeXAccessToken';
import { refreshXAccessToken } from '../../utils/services/oauth/x/refreshXAccessToken';
import { createXAuthorization } from '../../utils/services/oauth/x/createXAuthorization';
import { assertXConfiguration } from '../../utils/services/oauth/x/assertXConfiguration';
import { getAuthenticatedXUser } from '../../utils/services/oauth/x/getAuthenticatedXUser';
import {
  X_AUTHORIZE_URL,
  OAUTH_STATE_TTL_MS,
  X_AUTHENTICATED_USER_URL,
  X_TOKEN_URL,
  X_REVOKE_URL,
} from '../../constants/services/oauth/x';

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
