import { describe, expect, it } from 'vitest';

import {
  decryptSecret,
  encryptSecret,
} from '../../src/services/integration/credentialEncryption.js';

const encryptionKey = Buffer.from('a'.repeat(64), 'hex');

describe('provider credential encryption', () => {
  it('encrypts and decrypts a provider secret', () => {
    const encrypted = encryptSecret('github-access-token', encryptionKey);

    expect(encrypted.ciphertext).not.toContain('github-access-token');
    expect(decryptSecret(encrypted, encryptionKey)).toBe('github-access-token');
  });

  it('uses a unique initialization vector for each encryption', () => {
    const first = encryptSecret('same-secret', encryptionKey);
    const second = encryptSecret('same-secret', encryptionKey);

    expect(first.initializationVector).not.toBe(second.initializationVector);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });
});
