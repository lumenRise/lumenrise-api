import type { Types } from 'mongoose';

import ProviderCredential from '../../models/ProviderCredential.js';
import { decryptSecret, encryptSecret } from './credentialEncryption.js';
import type { ExternalAccountProvider } from '../../types/integration/model.js';
import type {
  ProviderCredentialInput,
  StoredProviderCredential,
} from '../../types/integration/credential.js';

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

const storeProviderCredential = async (
  externalAccountId: Types.ObjectId,
  provider: ExternalAccountProvider,
  credential: ProviderCredentialInput,
): Promise<void> => {
  await ProviderCredential.findOneAndUpdate(
    { externalAccount: externalAccountId },
    {
      $set: {
        provider,
        accessToken: encryptSecret(credential.accessToken),
        refreshToken: credential.refreshToken ? encryptSecret(credential.refreshToken) : null,
        accessTokenExpiresAt: credential.accessTokenExpiresAt,
        refreshTokenExpiresAt: credential.refreshTokenExpiresAt,
      },
    },
    { upsert: true, runValidators: true },
  );
};

export { getProviderCredential, storeProviderCredential };
