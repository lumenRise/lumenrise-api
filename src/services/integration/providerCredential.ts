import type { Types } from 'mongoose';

import { encryptSecret } from './credentialEncryption';
import ProviderCredential from '../../models/ProviderCredential';
import type { ExternalAccountProvider } from '../../types/integration/model';
import type { ProviderCredentialInput } from '../../types/integration/credential';
import { getProviderCredential } from '../../utils/services/integration/providerCredential/getProviderCredential';
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
