import env from '../../../../env.js';

const getCredentialEncryptionKey = (): Buffer => {
  if (!/^[a-f\d]{64}$/i.test(env.CREDENTIAL_ENCRYPTION_KEY)) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY must be a 64-character hexadecimal key');
  }

  return Buffer.from(env.CREDENTIAL_ENCRYPTION_KEY, 'hex');
};

export { getCredentialEncryptionKey };
