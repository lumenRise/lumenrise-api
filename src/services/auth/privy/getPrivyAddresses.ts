import env from '../../../env';
import isBaseAddress from '../../../utils/base/isBaseAddress';

const getPrivyAddresses = async (userId: string, address?: string): Promise<string[] | null> => {
  if (!env.PRIVY_APP_ID || !env.PRIVY_APP_SECRET) {
    throw new Error('Privy is not configured');
  }

  const response = await fetch(`https://api.privy.io/v1/users/${encodeURIComponent(userId)}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.PRIVY_APP_ID}:${env.PRIVY_APP_SECRET}`).toString('base64')}`,
      'privy-app-id': env.PRIVY_APP_ID,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Privy lookup failed with status ${response.status}`);
  }

  const user: unknown = await response.json();

  if (
    !user ||
    typeof user !== 'object' ||
    !('id' in user) ||
    user.id !== userId ||
    !('linked_accounts' in user) ||
    !Array.isArray(user.linked_accounts)
  ) {
    throw new Error('Invalid Privy user response');
  }

  const addresses = new Set<string>();

  for (const account of user.linked_accounts as unknown[]) {
    if (
      account &&
      typeof account === 'object' &&
      'type' in account &&
      (account.type === 'wallet' || account.type === 'smart_wallet') &&
      (account.type === 'smart_wallet' ||
        ('chain_type' in account && account.chain_type === 'ethereum')) &&
      'address' in account &&
      isBaseAddress(account.address)
    ) {
      addresses.add(account.address.toLowerCase());
    }
  }

  if (address !== undefined && !addresses.has(address.toLowerCase())) {
    return null;
  }

  return [...addresses];
};

export default getPrivyAddresses;
