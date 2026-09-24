import { afterEach, describe, expect, it, vi } from 'vitest';

import getStellarAccountOverview from '../../src/services/stellar/getAccountOverview.js';

const address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const checkedAt = new Date('2026-09-23T12:00:00.000Z');

describe('Stellar account overview', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns public account facts without claiming wallet ownership', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        account_id: address,
        sequence: '123456789012345',
        subentry_count: 2,
        num_sponsoring: 1,
        num_sponsored: 0,
        last_modified_ledger: 99,
        home_domain: 'example.org',
        signers: [{ key: address, type: 'ed25519_public_key', weight: 1 }],
        thresholds: { low_threshold: 1, med_threshold: 1, high_threshold: 1 },
        balances: [
          { asset_type: 'native', balance: '2.5000000' },
          {
            asset_type: 'credit_alphanum4',
            asset_code: 'USDC',
            asset_issuer: address,
            balance: '10.0000000',
            limit: '100.0000000',
            is_authorized: true,
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await getStellarAccountOverview(address, checkedAt);

    expect(fetchMock.mock.calls[0]?.[0].toString()).toBe(
      `https://horizon-testnet.stellar.org/accounts/${address}`,
    );
    expect(result).toMatchObject({
      address,
      ownershipVerified: false,
      sequence: '123456789012345',
      signerCount: 1,
      balances: [
        { assetType: 'native', balance: '2.5000000', assetCode: null },
        { assetType: 'credit_alphanum4', balance: '10.0000000', assetCode: 'USDC' },
      ],
      checkedAt: checkedAt.toISOString(),
    });
  });

  it('returns null when the address has no account on the configured network', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    expect(await getStellarAccountOverview(address)).toBeNull();
  });

  it('rejects invalid addresses before contacting Horizon', async () => {
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);

    await expect(getStellarAccountOverview('not-a-wallet')).rejects.toThrow(
      'Invalid Stellar account address',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects malformed and unsuccessful Horizon responses', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ account_id: address, balances: null }),
      });

    vi.stubGlobal('fetch', fetchMock);

    await expect(getStellarAccountOverview(address)).rejects.toThrow('status 503');
    await expect(getStellarAccountOverview(address)).rejects.toThrow('invalid account response');
  });
});
