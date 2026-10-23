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

  it('pins the exact selected address to the current user ID', async () => {
    vi.mocked(requestAuthProvider).mockResolvedValue({
      exists: true,
      user_id: 87,
      network: 'stellar',
    });

    expect(await verifyProviderAddress('87', address)).toBe(true);
    expect(requestAuthProvider).toHaveBeenCalledWith('server/wallets/verify', {
      address,
      user_id: 87,
    });
  });

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
