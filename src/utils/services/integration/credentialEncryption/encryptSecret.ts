import { createCipheriv, randomBytes } from 'node:crypto';

import { getCredentialEncryptionKey } from './getCredentialEncryptionKey';
import type { EncryptedSecret } from '../../../../types/integration/credential';
import { ALGORITHM } from '../../../../constants/services/integration/credentialEncryption';
import { INITIALIZATION_VECTOR_LENGTH } from '../../../../constants/services/integration/credentialEncryption';

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

export { encryptSecret };
