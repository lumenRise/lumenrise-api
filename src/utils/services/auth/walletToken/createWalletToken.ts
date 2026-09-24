import { signPart } from './signPart.js';
import type { WalletAuthTokenPayload } from '../../../../types/auth/wallet.js';

const createWalletToken = (payload: WalletAuthTokenPayload): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const unsigned = `${header}.${body}`;

  return `${unsigned}.${signPart(unsigned).toString('base64url')}`;
};

export { createWalletToken };
