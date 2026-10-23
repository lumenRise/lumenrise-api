import { StrKey } from '@stellar/stellar-sdk';

import verifyProviderAddress from './verifyProviderAddress';
import { requestAuthProvider } from '../../utils/services/auth/provider/requestAuthProvider';
import { parseExternalUserId } from '../../utils/services/auth/provider/parseExternalUserId';

const getVerifiedProviderAddresses = async (
  userId: string,
  address?: string,
): Promise<string[] | null> => {
  const user = await requestAuthProvider(`server/users/${userId}`);

  if (user === null) {
    return null;
  }

  if (
    !user ||
    typeof user !== 'object' ||
    !('id' in user) ||
    parseExternalUserId(user.id) !== userId
  ) {
    throw new Error('Invalid Auth provider user');
  }

  const candidates: unknown[] = address ? [address] : [];

  if ('wallet' in user) {
    candidates.push(user.wallet);
  }

  if ('accounts' in user && Array.isArray(user.accounts)) {
    for (const account of user.accounts) {
      if (account && account.network === 'stellar') {
        candidates.push(account.public_key);
      }
    }
  }

  const addresses = [
    ...new Set(
      candidates.filter(
        (address): address is string =>
          typeof address === 'string' && StrKey.isValidEd25519PublicKey(address),
      ),
    ),
  ];

  for (const address of addresses) {
    if (!(await verifyProviderAddress(userId, address))) {
      return null;
    }
  }

  return addresses;
};

export { parseExternalUserId, getVerifiedProviderAddresses };
