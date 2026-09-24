import type { Types } from 'mongoose';

import { refreshXAccessToken } from '../../../../services/oauth/x.js';
import { needsCredentialRefresh } from '../../../../services/integration/githubSync.js';
import {
  getProviderCredential,
  storeProviderCredential,
} from '../../../../services/integration/providerCredential.js';

const resolveXAccessToken = async (externalAccountId: Types.ObjectId): Promise<string | null> => {
  const credential = await getProviderCredential(externalAccountId);

  if (!credential || credential.provider !== 'x') {
    return null;
  }

  if (!needsCredentialRefresh(credential.accessTokenExpiresAt)) {
    return credential.accessToken;
  }

  if (!credential.refreshToken) {
    return null;
  }

  const token = await refreshXAccessToken(credential.refreshToken);
  const accessToken = token.access_token as string;

  await storeProviderCredential(externalAccountId, 'x', {
    accessToken,
    refreshToken: token.refresh_token ?? credential.refreshToken,
    accessTokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1_000) : null,
    refreshTokenExpiresAt: null,
  });

  return accessToken;
};

export { resolveXAccessToken };
