import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import ProviderCredential from '../../src/models/ProviderCredential.js';

describe('ProviderCredential model', () => {
  it('accepts encrypted provider tokens', async () => {
    const encryptedSecret = {
      ciphertext: 'ciphertext',
      initializationVector: 'initialization-vector',
      authenticationTag: 'authentication-tag',
    };
    const credential = new ProviderCredential({
      externalAccount: new Types.ObjectId(),
      provider: 'github',
      accessToken: encryptedSecret,
      refreshToken: encryptedSecret,
      accessTokenExpiresAt: new Date(),
      refreshTokenExpiresAt: new Date(),
    });

    await expect(credential.validate()).resolves.toBeUndefined();
  });

  it('rejects unsupported providers', async () => {
    const credential = new ProviderCredential({
      externalAccount: new Types.ObjectId(),
      provider: 'unsupported',
      accessToken: {
        ciphertext: 'ciphertext',
        initializationVector: 'initialization-vector',
        authenticationTag: 'authentication-tag',
      },
    });

    await expect(credential.validate()).rejects.toThrow();
  });
});
