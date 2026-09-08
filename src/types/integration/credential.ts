import type { HydratedDocument, Types } from 'mongoose';

import type { ExternalAccountProvider } from './model.js';

interface EncryptedSecret {
  ciphertext: string;
  initializationVector: string;
  authenticationTag: string;
}

interface ProviderCredentialRecord {
  externalAccount: Types.ObjectId;
  provider: ExternalAccountProvider;
  accessToken: EncryptedSecret;
  refreshToken: EncryptedSecret | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ProviderCredentialInput {
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
}

type ProviderCredentialDocument = HydratedDocument<ProviderCredentialRecord>;

export type {
  EncryptedSecret,
  ProviderCredentialDocument,
  ProviderCredentialInput,
  ProviderCredentialRecord,
};
