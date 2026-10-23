import { Keypair } from '@stellar/stellar-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getVerifiedProviderAddresses,
  parseExternalUserId,
} from '../../src/services/auth/provider';

vi.mock('../../src/env', () => ({
  default: {
    AUTH_PROVIDER_API_URL: 'https://identity.example',
    AUTH_PROVIDER_APP_ID: 'app-id',
    AUTH_PROVIDER_APP_SECRET: 'app-secret',
  },
}));
const address = Keypair.random().publicKey();
const reply = (result: unknown, status = 200) =>
  new Response(JSON.stringify({ result }), { status });

describe('Auth provider registration verification', () => {
  let fetch: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches project-scoped information and pins wallet verification to the same user', async () => {
    fetch
      .mockResolvedValueOnce(
        reply({ id: 42, wallet: address, accounts: [{ network: 'stellar', public_key: address }] }),
      )
      .mockResolvedValueOnce(reply({ exists: true, user_id: 42, network: 'stellar' }));
    expect(await getVerifiedProviderAddresses('42')).toEqual([address]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'https://identity.example/server/users/42',
      expect.objectContaining({
        headers: { authorization: `Basic ${Buffer.from('app-id:app-secret').toString('base64')}` },
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'https://identity.example/server/wallets/verify',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ address, user_id: 42 }),
      }),
    );
  });

  it('treats a 200 negative verification as failure', async () => {
    fetch
      .mockResolvedValueOnce(
        reply({ id: 42, accounts: [{ network: 'stellar', public_key: address }] }),
      )
      .mockResolvedValueOnce(reply({ exists: false }));
    expect(await getVerifiedProviderAddresses('42')).toBeNull();
  });

  it('rejects a different user returned by Auth provider', async () => {
    fetch.mockResolvedValueOnce(reply({ id: 43, wallet: address }));
    await expect(getVerifiedProviderAddresses('42')).rejects.toThrow('Invalid Auth provider user');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects a wallet match for a different user', async () => {
    fetch
      .mockResolvedValueOnce(reply({ id: 42, wallet: address }))
      .mockResolvedValueOnce(reply({ exists: true, user_id: 43, network: 'stellar' }));
    expect(await getVerifiedProviderAddresses('42')).toBeNull();
  });

  it('returns no registration for a missing project user', async () => {
    fetch.mockResolvedValueOnce(reply({}, 404));
    expect(await getVerifiedProviderAddresses('42')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('distinguishes upstream failure from a missing user', async () => {
    fetch.mockResolvedValueOnce(reply({}, 500));
    await expect(getVerifiedProviderAddresses('42')).rejects.toThrow(
      'Auth provider request failed (500)',
    );
  });

  it('does not register Ethereum addresses as Stellar wallets', async () => {
    fetch.mockResolvedValueOnce(
      reply({ id: 42, accounts: [{ network: 'ethereum', public_key: '0xabc' }] }),
    );
    expect(await getVerifiedProviderAddresses('42')).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('verifies a selected external wallet even when it is absent from the user wallet list', async () => {
    fetch
      .mockResolvedValueOnce(reply({ id: 42, accounts: [] }))
      .mockResolvedValueOnce(reply({ exists: true, user_id: 42, network: 'stellar' }));

    expect(await getVerifiedProviderAddresses('42', address)).toEqual([address]);
    expect(fetch).toHaveBeenLastCalledWith(
      'https://identity.example/server/wallets/verify',
      expect.objectContaining({ body: JSON.stringify({ address, user_id: 42 }) }),
    );
  });

  it('canonicalizes numeric IDs without accepting unsafe or ambiguous values', () => {
    expect(parseExternalUserId(42)).toBe('42');
    expect(parseExternalUserId('42')).toBe('42');
    for (const value of [
      undefined,
      null,
      {},
      0,
      -1,
      42.1,
      '042',
      '42e0',
      '42/other',
      9007199254740992,
    ]) {
      expect(parseExternalUserId(value)).toBeNull();
    }
  });
});
