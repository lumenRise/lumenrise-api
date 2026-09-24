import type { Types } from 'mongoose';

import ProviderCredential from '../../../../models/ProviderCredential.js';
import { decryptSecret } from '../../../../services/integration/credentialEncryption.js';
import type { StoredProviderCredential } from '../../../../types/integration/credential.js';

const getProviderCredential = async (
  externalAccountId: Types.ObjectId,
): Promise<StoredProviderCredential | null> => {
  const credential = await ProviderCredential.findOne({
    externalAccount: externalAccountId,
  }).select('+accessToken +refreshToken');

  if (!credential) {
    return null;
  }

  return {
    provider: credential.provider,
    accessToken: decryptSecret(credential.accessToken),
    refreshToken: credential.refreshToken ? decryptSecret(credential.refreshToken) : null,
    accessTokenExpiresAt: credential.accessTokenExpiresAt,
    refreshTokenExpiresAt: credential.refreshTokenExpiresAt,
  };
};

export { getProviderCredential };
