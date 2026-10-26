import { afterEach, expect, it, vi } from 'vitest';

import parsePrivyUserId from '../../src/services/auth/privy/parsePrivyUserId';
import getPrivyAddresses from '../../src/services/auth/privy/getPrivyAddresses';

vi.mock('../../src/env', () => ({
  default: { PRIVY_APP_ID: 'test-app', PRIVY_APP_SECRET: 'test-secret' },
}));

const userId = 'did:privy:testuser';
const address = '0x1111111111111111111111111111111111111111';

afterEach((): void => {
  vi.unstubAllGlobals();
});

it('accepts opaque Privy IDs without numeric conversion', (): void => {
  expect(parsePrivyUserId(userId)).toBe(userId);

  expect(parsePrivyUserId('42')).toBeNull();

  expect(parsePrivyUserId('did:privy:../users')).toBeNull();

  expect(parsePrivyUserId(42)).toBeNull();
});

it('verifies the requested wallet against linked EVM accounts only', async (): Promise<void> => {
  const fetch = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        id: userId,
        linked_accounts: [
          { type: 'wallet', chain_type: 'ethereum', address },
          { type: 'wallet', chain_type: 'solana', address: 'other-wallet' },
          { type: 'email', address: 'alice@example.com' },
          { type: 'wallet', chain_type: 'ethereum', address },
        ],
      }),
    ),
  );

  vi.stubGlobal('fetch', fetch);

  expect(await getPrivyAddresses(userId, address)).toEqual([address]);

  expect(fetch).toHaveBeenCalledWith(
    `https://api.privy.io/v1/users/${encodeURIComponent(userId)}`,
    expect.objectContaining({
      headers: expect.objectContaining({ 'privy-app-id': 'test-app' }),
      signal: expect.any(AbortSignal),
    }),
  );
});

it('rejects an address that the Privy user does not own', async (): Promise<void> => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: userId, linked_accounts: [] }))),
  );

  expect(await getPrivyAddresses(userId, address)).toBeNull();
});

it('distinguishes a missing user from an unavailable provider', async (): Promise<void> => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));

  expect(await getPrivyAddresses(userId)).toBeNull();

  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })));

  await expect(getPrivyAddresses(userId)).rejects.toThrow('429');
});

it('rejects a mismatched user response and accepts linked smart wallets', async (): Promise<void> => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 'did:privy:other', linked_accounts: [] })),
      ),
  );

  await expect(getPrivyAddresses(userId)).rejects.toThrow('Invalid Privy');

  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ id: userId, linked_accounts: [{ type: 'smart_wallet', address }] }),
        ),
      ),
  );

  expect(await getPrivyAddresses(userId)).toEqual([address]);
});
