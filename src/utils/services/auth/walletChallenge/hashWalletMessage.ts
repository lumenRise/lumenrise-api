import { createHash } from 'node:crypto';

import { SIGNED_MESSAGE_PREFIX } from '../../../../constants/services/auth/walletChallenge.js';

const hashWalletMessage = (message: string): Buffer =>
  createHash('sha256').update(SIGNED_MESSAGE_PREFIX).update(message, 'utf8').digest();

export { hashWalletMessage };
