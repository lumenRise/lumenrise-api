import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import env from '../../env.js';
import type { EncryptedSecret } from '../../types/integration/credential.js';

const ALGORITHM = 'aes-256-gcm';
const INITIALIZATION_VECTOR_LENGTH = 12;
const getCredentialEncryptionKey = (): Buffer => {
  if (!/^[a-f\d]{64}$/i.test(env.CREDENTIAL_ENCRYPTION_KEY)) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY must be a 64-character hexadecimal key');
  }

  return Buffer.from(env.CREDENTIAL_ENCRYPTION_KEY, 'hex');
};
const encryptSecret = (value: string, key = getCredentialEncryptionKey()): EncryptedSecret => {
  const initializationVector = randomBytes(INITIALIZATION_VECTOR_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, initializationVector);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);

  return {
    ciphertext: ciphertext.toString('base64'),
    initializationVector: initializationVector.toString('base64'),
    authenticationTag: cipher.getAuthTag().toString('base64'),
  };
};
const decryptSecret = (value: EncryptedSecret, key = getCredentialEncryptionKey()): string => {
  const initializationVector = Buffer.from(value.initializationVector, 'base64');
  const authenticationTag = Buffer.from(value.authenticationTag, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, initializationVector);

  decipher.setAuthTag(authenticationTag);

  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
};

export { decryptSecret, encryptSecret };
