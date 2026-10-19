import { StrKey } from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';

import parseLaunchListQuery from '../src/utils/launch/parseLaunchListQuery';

vi.mock('../src/env', () => ({ default: { STELLAR_AUTH_NETWORK: 'testnet' } }));

const pair = StrKey.encodeContract(Buffer.alloc(32, 90));

describe('launch list queries', () => {
  it('accepts client category spelling and query aliases', () => {
    expect(
      parseLaunchListQuery({ category: 'Bonding Curve', q: ' Token ', dir: 'asc' }),
    ).toMatchObject({
      category: 'bonding-curve',
      search: 'Token',
      direction: 'asc',
      network: 'testnet',
    });
  });

  it.each(['topVolume', 'figure'])('requires the payment asset for %s', (sort) => {
    expect(parseLaunchListQuery({ sort })).toBeNull();
    expect(parseLaunchListQuery({ sort, pair })).toMatchObject({ sort, pair });
  });

  it.each([
    { network: 'invalid' },
    { owner: 'bad' },
    { pair: 'XLM' },
    { sort: 'bad' },
    { category: 'DeFi' },
    { page: '0' },
    { page: '1.5' },
    { limit: '101' },
    { direction: 'up' },
    { search: 'a'.repeat(101) },
    { search: ['a', 'b'] },
  ])('rejects invalid query %j', (query) => {
    expect(parseLaunchListQuery(query)).toBeNull();
  });
});
