import { describe, expect, it } from 'vitest';

import type { LaunchRecord } from '../src/types/launch/model';
import toBondingSummary from '../src/utils/launch/toBondingSummary';

const launch: LaunchRecord = {
  network: 'testnet',
  factoryContractId: 'factory',
  factoryIndex: 1,
  contractId: 'curve',
  owner: 'owner',
  asset: 'asset',
  pair: 'pair',
  metadata: { name: 'Test', symbol: 'TEST', description: '', logo: '' },
  config: {
    total_supply: '100000000',
    platform_fee_bps: 100,
    buckets: { pool: '20000000', curve: '70000000', team: '10000000' },
    params: {
      starts_at: '1791000000',
      ends_at: '1792000000',
      allocations: { pool_bps: 2000, curve_bps: 7000, team_bps: 1000 },
      vesting: { cliff_seconds: '0', duration_seconds: '2592000', schedule: { tag: 'Weekly' } },
      curve: {
        graduation_target: '40000000',
        virtual_base_reserve: '210000000',
        virtual_quote_reserve: '210000000',
        creator_fee_bps: 10,
        creator_payout_bps: 1000,
      },
    },
  },
  state: {
    sold: '10000000',
    quote_reserve: '20000000',
    creator_fees: '1000000',
    team_claimed: '0',
    buyer_count: 2,
    graduated: false,
  },
  asOfLedger: 1,
  observedAt: new Date('2026-10-03T00:00:00.000Z'),
  stateAsOfLedger: 2,
  stateObservedAt: new Date(1791000000 * 1000),
};

describe('Bonding launch summary', () => {
  it('derives time and chain phases without mixing creator fees into progress', () => {
    expect(toBondingSummary(launch, new Date(1790999999 * 1000))?.status).toBe('Scheduled');
    const open = toBondingSummary(launch, new Date(1791000000 * 1000));
    expect(open).toMatchObject({
      status: 'Open',
      progressBps: 5000,
      stateStale: false,
      curve: { graduationTarget: '40000000' },
      state: { quoteReserve: '20000000', creatorFees: '1000000', buyerCount: 2 },
    });
    expect(toBondingSummary(launch, new Date(1792000000 * 1000))?.status).toBe('Failed');
    expect(
      toBondingSummary(
        { ...launch, state: { ...launch.state, graduated: true } },
        new Date(1792000000 * 1000),
      )?.status,
    ).toBe('Graduated');
  });

  it('caps overshoot and marks an old state observation without requesting RPC', () => {
    const result = toBondingSummary(
      { ...launch, state: { ...launch.state, quote_reserve: '50000000' } },
      new Date(1791000061 * 1000),
    );
    expect(result).toMatchObject({ progressBps: 10000, stateStale: true });
  });

  it('accepts the enum shape returned as a Soroban variant tuple', () => {
    const params = launch.config.params as Record<string, unknown>;
    const summary = toBondingSummary(
      {
        ...launch,
        config: {
          ...launch.config,
          params: {
            ...params,
            vesting: { cliff_seconds: '0', duration_seconds: '2592000', schedule: ['Weekly'] },
          },
        },
      },
      new Date(1791000000 * 1000),
    );
    expect(summary?.vesting.schedule).toBe('Weekly');
  });

  it('keeps older incomplete records readable with a null summary', () => {
    expect(toBondingSummary({ ...launch, config: { total_supply: '100000000' } })).toBeNull();
  });
});
