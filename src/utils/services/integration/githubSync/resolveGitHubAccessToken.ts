import type { Types } from 'mongoose';

import { needsCredentialRefresh } from './needsCredentialRefresh.js';
import { refreshGitHubAccessToken } from '../../../../services/oauth/github.js';
import {
  getProviderCredential,
  storeProviderCredential,
} from '../../../../services/integration/providerCredential.js';

const resolveGitHubAccessToken = async (
  externalAccountId: Types.ObjectId,
): Promise<string | null> => {
  const credential = await getProviderCredential(externalAccountId);

  if (!credential || credential.provider !== 'github') {
    return null;
  }

  if (!needsCredentialRefresh(credential.accessTokenExpiresAt)) {
    return credential.accessToken;
  }

  if (
    !credential.refreshToken ||
    (credential.refreshTokenExpiresAt && credential.refreshTokenExpiresAt <= new Date())
  ) {
    return null;
  }

  const token = await refreshGitHubAccessToken(credential.refreshToken);
  const accessToken = token.access_token as string;

  await storeProviderCredential(externalAccountId, 'github', {
    accessToken,
    refreshToken: token.refresh_token ?? credential.refreshToken,
    accessTokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1_000) : null,
    refreshTokenExpiresAt: token.refresh_token_expires_in
      ? new Date(Date.now() + token.refresh_token_expires_in * 1_000)
      : credential.refreshTokenExpiresAt,
  });

  return accessToken;
};

export { resolveGitHubAccessToken };
