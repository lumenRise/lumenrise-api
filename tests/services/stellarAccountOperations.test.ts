import { afterEach, describe, expect, it, vi } from 'vitest';

import getStellarAccountOperations from '../../src/services/stellar/getAccountOperations.js';

const address = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const operation = {
  id: '100',
  paging_token: '100',
  type: 'payment',
  type_i: 1,
  created_at: '2026-09-23T12:00:00Z',
  transaction_hash: 'a'.repeat(64),
  source_account: address,
  transaction_successful: true,
  amount: '12.0000000',
  asset_type: 'native',
  _links: { self: { href: '/operations/100' } },
};

describe('Stellar account operations', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves type-specific operation facts and returns a cursor for a full page', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ _embedded: { records: [operation] } }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await getStellarAccountOperations(address, '101', 1, 'desc');
    const url = fetchMock.mock.calls[0]?.[0] as URL;

    expect(url.pathname).toBe(`/accounts/${address}/operations`);
    expect(url.searchParams.get('cursor')).toBe('101');
    expect(url.searchParams.get('limit')).toBe('1');
    expect(result).toMatchObject({
      address,
      ownershipVerified: false,
      nextCursor: '100',
      items: [
        {
          pagingToken: '100',
          type: 'payment',
          details: { amount: '12.0000000', asset_type: 'native' },
        },
      ],
    });
    expect(result?.items[0]?.details).not.toHaveProperty('_links');
  });

  it('ends pagination when fewer records than requested are returned', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ _embedded: { records: [operation] } }),
      }),
    );

    expect((await getStellarAccountOperations(address, null, 2))?.nextCursor).toBeNull();
  });

  it('returns null for an account missing on the configured network', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    expect(await getStellarAccountOperations(address)).toBeNull();
  });

  it('rejects invalid pagination before contacting Horizon', async () => {
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);

    await expect(getStellarAccountOperations(address, 'bad-cursor')).rejects.toThrow(
      'Invalid Stellar operations cursor',
    );
    await expect(getStellarAccountOperations(address, null, 201)).rejects.toThrow(
      'Invalid Stellar operations page limit',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects malformed operation pages and repeated cursors', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ _embedded: {} }) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ _embedded: { records: [operation] } }),
      });

    vi.stubGlobal('fetch', fetchMock);

    await expect(getStellarAccountOperations(address)).rejects.toThrow(
      'invalid operations response',
    );
    await expect(getStellarAccountOperations(address, '100', 1)).rejects.toThrow(
      'repeated operations cursor',
    );
  });
});
