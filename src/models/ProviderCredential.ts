import { Schema, model } from 'mongoose';

import { EXTERNAL_ACCOUNT_PROVIDERS } from '../constants/integration.js';
import type { ProviderCredentialRecord } from '../types/integration/credential.js';

const encryptedSecretSchema = new Schema(
  {
    ciphertext: { type: String, required: true, select: false },
    initializationVector: { type: String, required: true, select: false },
    authenticationTag: { type: String, required: true, select: false },
  },
  { _id: false, versionKey: false },
);
const providerCredentialSchema = new Schema<ProviderCredentialRecord>(
  {
    externalAccount: {
      type: Schema.Types.ObjectId,
      ref: 'ExternalAccount',
      required: true,
      immutable: true,
    },
    provider: {
      type: String,
      enum: EXTERNAL_ACCOUNT_PROVIDERS,
      required: true,
      immutable: true,
    },
    accessToken: { type: encryptedSecretSchema, required: true, select: false },
    refreshToken: { type: encryptedSecretSchema, default: null, select: false },
    accessTokenExpiresAt: { type: Date, default: null },
    refreshTokenExpiresAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

providerCredentialSchema.index(
  { externalAccount: 1 },
  { unique: true, name: 'provider_credentials_external_account_unique' },
);

const ProviderCredential = model<ProviderCredentialRecord>(
  'ProviderCredential',
  providerCredentialSchema,
);

export default ProviderCredential;
