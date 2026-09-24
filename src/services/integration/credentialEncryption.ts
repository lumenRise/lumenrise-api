import { createDecipheriv } from 'node:crypto';

import type { EncryptedSecret } from '../../types/integration/credential.js';
import { encryptSecret } from '../../utils/services/integration/credentialEncryption/encryptSecret.js';
import {
  ALGORITHM,
  INITIALIZATION_VECTOR_LENGTH,
} from '../../constants/services/integration/credentialEncryption.js';
import { getCredentialEncryptionKey } from '../../utils/services/integration/credentialEncryption/getCredentialEncryptionKey.js';

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

export { ALGORITHM, INITIALIZATION_VECTOR_LENGTH };
