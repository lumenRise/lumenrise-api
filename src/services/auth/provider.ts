import { StrKey } from '@stellar/stellar-sdk';

import { requestAuthProvider } from '../../utils/services/auth/provider/requestAuthProvider';
import { parseExternalUserId } from '../../utils/services/auth/provider/parseExternalUserId';

const getVerifiedProviderAddresses = async (userId: string): Promise<string[] | null> => {
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

  const candidates: unknown[] = [];

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
    const result = await requestAuthProvider('server/wallets/verify', {
      address,
      user_id: Number(userId),
    });

    if (
      !result ||
      typeof result !== 'object' ||
      !('exists' in result) ||
      result.exists !== true ||
      !('user_id' in result) ||
      parseExternalUserId(result.user_id) !== userId ||
      !('network' in result) ||
      result.network !== 'stellar'
    ) {
      return null;
    }
  }
  return addresses;
};

export { parseExternalUserId, getVerifiedProviderAddresses };
