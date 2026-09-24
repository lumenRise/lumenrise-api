import type { Types } from 'mongoose';

import { refreshGitLabAccessToken } from '../../../../services/oauth/gitlab.js';
import { needsCredentialRefresh } from '../../../../services/integration/githubSync.js';
import {
  getProviderCredential,
  storeProviderCredential,
} from '../../../../services/integration/providerCredential.js';

const resolveGitLabAccessToken = async (
  externalAccountId: Types.ObjectId,
): Promise<string | null> => {
  const credential = await getProviderCredential(externalAccountId);

  if (!credential || credential.provider !== 'gitlab') {
    return null;
  }

  if (!needsCredentialRefresh(credential.accessTokenExpiresAt)) {
    return credential.accessToken;
  }

  if (!credential.refreshToken) {
    return null;
  }

  const token = await refreshGitLabAccessToken(credential.refreshToken);
  const accessToken = token.access_token as string;

  await storeProviderCredential(externalAccountId, 'gitlab', {
    accessToken,
    refreshToken: token.refresh_token ?? credential.refreshToken,
    accessTokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1_000) : null,
    refreshTokenExpiresAt: null,
  });

  return accessToken;
};

export { resolveGitLabAccessToken };
