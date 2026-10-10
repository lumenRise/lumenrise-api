import type { Request, Response } from 'express';
import { Keypair, StrKey } from '@stellar/stellar-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Launch from '../src/models/Launch';
import getLaunchesRoute from '../src/routes/launches/get';
import getLaunchByContractIdRoute from '../src/routes/launches/getByContractId';

vi.mock('../src/models/Launch', () => ({
  default: { find: vi.fn(), countDocuments: vi.fn(), findOne: vi.fn() },
}));

const contractId = StrKey.encodeContract(Buffer.alloc(32, 1));
const factoryContractId = StrKey.encodeContract(Buffer.alloc(32, 2));
const owner = Keypair.random().publicKey();
const launch = {
  network: 'testnet',
  factoryContractId,
  factoryIndex: 1,
  contractId,
  owner,
  asset: StrKey.encodeContract(Buffer.alloc(32, 3)),
  pair: StrKey.encodeContract(Buffer.alloc(32, 4)),
  metadata: { name: 'Launch', description: '', logo: '', symbol: 'LAUNCH' },
  config: {
    total_supply: '10000000', platform_fee_bps: 100,
    buckets: { pool: '2000000', curve: '7000000', team: '1000000' },
    params: {
      starts_at: '1791000000', ends_at: '1792000000',
      allocations: { pool_bps: 2000, curve_bps: 7000, team_bps: 1000 },
      vesting: { cliff_seconds: '0', duration_seconds: '2592000', schedule: { tag: 'Weekly' } },
      curve: {
        graduation_target: '4000000', virtual_base_reserve: '21000000',
        virtual_quote_reserve: '21000000', creator_fee_bps: 10, creator_payout_bps: 1000,
      },
    },
  },
  state: {
    sold: '0', quote_reserve: '0', creator_fees: '0', team_claimed: '0',
    buyer_count: 0, graduated: false,
  },
  asOfLedger: 123,
  observedAt: new Date('2026-10-03T00:00:00.000Z'),
  stateAsOfLedger: 124,
  stateObservedAt: new Date('2026-10-03T00:00:05.000Z'),
};

const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() });

describe('public launch handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('lists only the requested network and returns chain-backed data', async () => {
    const lean = vi.fn().mockResolvedValue([launch]);
    const limit = vi.fn().mockReturnValue({ lean });
    const skip = vi.fn().mockReturnValue({ limit });
    const sort = vi.fn().mockReturnValue({ skip });
    vi.mocked(Launch.find).mockReturnValue({ sort } as never);
    vi.mocked(Launch.countDocuments).mockResolvedValue(1 as never);

    const res = response();

    await getLaunchesRoute(
      { query: { network: 'testnet', limit: '10' } } as unknown as Request,
      res as unknown as Response,
      vi.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(Launch.find).toHaveBeenCalledWith({ network: 'testnet' });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      result: expect.objectContaining({
        launches: [expect.objectContaining({ contractId, asOfLedger: 123, bonding: expect.objectContaining({ version: 1, progressBps: 0 }) })],
      }),
    }));
  });

  it('returns one confirmed launch by contract ID', async () => {
    vi.mocked(Launch.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue(launch) } as never);

    const res = response();

    await getLaunchByContractIdRoute(
      { query: { network: 'testnet' }, params: { contractId } } as unknown as Request,
      res as unknown as Response,
      vi.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(Launch.findOne).toHaveBeenCalledWith({ network: 'testnet', contractId });
  });

  it('rejects invalid contract IDs before querying storage', async () => {
    const res = response();

    await getLaunchByContractIdRoute(
      { query: { network: 'public' }, params: { contractId: 'not-a-contract' } } as unknown as Request,
      res as unknown as Response,
      vi.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Launch.findOne).not.toHaveBeenCalled();
  });
});
