import { Keypair } from '@stellar/stellar-sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';

import verifyProviderAddress from '../../src/services/auth/verifyProviderAddress';
import { requestAuthProvider } from '../../src/utils/services/auth/provider/requestAuthProvider';

vi.mock('../../src/utils/services/auth/provider/requestAuthProvider', () => ({
  requestAuthProvider: vi.fn(),
}));

const address = Keypair.random().publicKey();

describe('selected wallet verification', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it.each(['87', 'ekfvknkfkwsmaka322aa'])(
    'pins the exact selected address to user %s without numeric conversion',
    async (userId: string): Promise<void> => {
      vi.mocked(requestAuthProvider).mockResolvedValue({
        exists: true,
        user_id: userId,
        network: 'stellar',
      });

      expect(await verifyProviderAddress(userId, address)).toBe(true);
      expect(requestAuthProvider).toHaveBeenCalledWith('server/wallets/verify', {
        address,
        user_id: userId,
      });
    },
  );

  it.each([
    null,
    {},
    { exists: false },
    { exists: true, user_id: 42, network: 'stellar' },
    { exists: true, user_id: 87, network: 'ethereum' },
    { exists: true, network: 'stellar' },
  ])('rejects negative, mismatched and malformed replies', async (reply: unknown) => {
    vi.mocked(requestAuthProvider).mockResolvedValue(reply);

    expect(await verifyProviderAddress('87', address)).toBe(false);
  });
});
