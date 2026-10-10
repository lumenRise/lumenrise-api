import { describe, expect, it } from 'vitest';
import { Keypair, StrKey } from '@stellar/stellar-sdk';

import validateDraftData from '../src/utils/launch/validateDraftData';
import validateDraftParams from '../src/utils/launch/validateDraftParams';

const owner = Keypair.random().publicKey();
const asset = StrKey.encodeContract(Buffer.alloc(32, 3));
const pair = StrKey.encodeContract(Buffer.alloc(32, 4));
const logo = 'https://images.example/token.png';
const params = {
  owner, asset, pair,
  metadata: { name: 'Launch', description: 'Test launch', logo, symbol: 'TEST' },
  allocations: { pool_bps: 2000, curve_bps: 7000, team_bps: 1000 },
  vesting: { cliff_seconds: '0', duration_seconds: '2592000', schedule: { tag: 'Weekly' } },
  curve: { virtual_base_reserve: '21000000', virtual_quote_reserve: '21000000', graduation_target: '4000000', creator_fee_bps: 10, creator_payout_bps: 1000 },
  starts_at: '1800000000', ends_at: '1801209600',
};

describe('bonding draft validation', () => {
  it('accepts partial private form data without issuer secrets', () => {
    expect(validateDraftData({ name: 'Launch', bonding: { target: '200', creatorFee: true } })).toBe(true);
    expect(validateDraftData({ issuerSecret: 'SSECRET' })).toBe(false);
  });

  it('requires submitted parameters to use the connected owner and owned image', () => {
    expect(validateDraftParams(params, owner, logo)).toBe(true);
    expect(validateDraftParams(params, Keypair.random().publicKey(), logo)).toBe(false);
    expect(validateDraftParams(params, owner, 'https://other.example/logo.png')).toBe(false);
  });

  it('rejects invalid allocations and schedule', () => {
    expect(validateDraftParams({ ...params, allocations: { ...params.allocations, team_bps: 2000 } }, owner, logo)).toBe(false);
    expect(validateDraftParams({ ...params, ends_at: params.starts_at }, owner, logo)).toBe(false);
  });
});
