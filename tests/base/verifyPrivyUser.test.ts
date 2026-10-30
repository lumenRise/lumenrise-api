import { beforeEach, expect, it, vi } from 'vitest';

import verifyPrivyUser from '../../src/services/auth/privy/verifyPrivyUser';

const { verifyAccessToken } = vi.hoisted(() => ({ verifyAccessToken: vi.fn() }));

vi.mock('@privy-io/node', () => ({
  PrivyClient: class {
    utils() {
      return { auth: () => ({ verifyAccessToken }) };
    }
  },
}));

vi.mock('../../src/env', () => ({
  default: { PRIVY_APP_ID: 'test-app', PRIVY_APP_SECRET: 'test-secret' },
}));

const userId = 'did:privy:testuser';

beforeEach((): void => {
  verifyAccessToken.mockReset();
});

it('verifies the bearer token using Privy and matches the authenticated user', async (): Promise<void> => {
  verifyAccessToken.mockResolvedValue({ user_id: userId });

  expect(await verifyPrivyUser('Bearer test-token', userId)).toBe(true);
  expect(verifyAccessToken).toHaveBeenCalledWith('test-token');
});

it.each([undefined, '', 'Basic test-token', 'Bearer ', 'Bearer token extra'])(
  'rejects missing or malformed authorization: %s',
  async (authorization): Promise<void> => {
    expect(await verifyPrivyUser(authorization, userId)).toBe(false);
    expect(verifyAccessToken).not.toHaveBeenCalled();
  },
);

it('rejects a valid token belonging to another Privy user', async (): Promise<void> => {
  verifyAccessToken.mockResolvedValue({ user_id: 'did:privy:other' });

  expect(await verifyPrivyUser('Bearer test-token', userId)).toBe(false);
});

it('rejects invalid, expired or wrong-app tokens rejected by Privy', async (): Promise<void> => {
  verifyAccessToken.mockRejectedValue(new Error('Invalid auth token'));

  expect(await verifyPrivyUser('Bearer test-token', userId)).toBe(false);
});
