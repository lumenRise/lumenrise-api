import type { Response } from 'express';
import { Keypair } from '@stellar/stellar-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Launch from '../src/models/Launch';
import request from './helpers/createMarketRequest';
import response from './helpers/createMarketResponse';
import LaunchHolder from '../src/models/LaunchHolder';
import getHolders from '../src/routes/launches/getHolders';
import createOpenApiValidator from './helpers/createOpenApiValidator';

vi.mock('../src/env', () => ({
  default: { STELLAR_AUTH_NETWORK: 'testnet', NODE_ENV: 'test', LOG_LEVEL: 'silent' },
}));
vi.mock('../src/models/Launch', () => ({ default: { findOne: vi.fn() } }));
vi.mock('../src/models/LaunchHolder', () => ({
  default: { find: vi.fn(), countDocuments: vi.fn() },
}));

const address = Keypair.random().publicKey();
const other = Keypair.random().publicKey();
const observedAt = new Date('2026-10-14T10:00:00Z');

describe('known launch token holders', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(Launch.findOne).mockReturnValue({
      lean: async () => ({ asset: request().params.contractId }),
    } as never);
    vi.mocked(LaunchHolder.countDocuments).mockResolvedValue(2);
  });

  it('lists highest balances first with exact values, a cursor and explicit snapshot coverage', async () => {
    const first = { address, balance: '9007199254740993', observedAt };
    const second = { address: other, balance: '9007199254740992', observedAt };
    const sort = vi.fn(() => ({ limit: () => ({ lean: async () => [first, second] }) }));
    vi.mocked(LaunchHolder.find).mockReturnValue({ sort } as never);
    const res = response();
    await getHolders(request({ limit: '1' }), res as unknown as Response, vi.fn());
    expect(sort).toHaveBeenCalledWith({ balanceSort: -1, address: 1 });
    const result = res.json.mock.calls[0]![0].result;
    expect(result).toMatchObject({
      totalHolders: 2,
      amountScale: 7,
      coverage: 'trade_participants',
      balanceSource: 'token_contract',
      items: [{ address, balance: first.balance, observedAt: observedAt.toISOString() }],
    });
    expect(JSON.parse(Buffer.from(result.nextCursor, 'base64url').toString())).toEqual([
      first.balance,
      address,
    ]);
    const validate = createOpenApiValidator({ $ref: '#/components/schemas/LaunchHolderList' });
    expect(validate(result), JSON.stringify(validate.errors)).toBe(true);
    await getHolders(
      request({ cursor: result.nextCursor }),
      response() as unknown as Response,
      vi.fn(),
    );
    expect(LaunchHolder.find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        $or: [
          { balanceSort: { $lt: first.balance.padStart(39, '0') } },
          { balanceSort: first.balance.padStart(39, '0'), address: { $gt: address } },
        ],
      }),
    );
  });

  it('returns no holders after the last wallet leaves', async () => {
    vi.mocked(LaunchHolder.find).mockReturnValue({
      sort: () => ({ limit: () => ({ lean: async () => [] }) }),
    } as never);
    vi.mocked(LaunchHolder.countDocuments).mockResolvedValue(0);
    const res = response();
    await getHolders(request(), res as unknown as Response, vi.fn());
    expect(res.json.mock.calls[0]![0].result).toMatchObject({
      totalHolders: 0,
      items: [],
      nextCursor: null,
    });
  });

  it('rejects malformed pagination and unsupported networks before querying the database', async () => {
    for (const query of [
      { limit: '101' },
      { cursor: 'invalid' },
      { network: 'other' },
      { cursor: ['bad'] },
    ]) {
      const res = response();
      await getHolders(request(query), res as unknown as Response, vi.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(Launch.findOne).not.toHaveBeenCalled();
  });

  it('returns 404 for unknown launches and 503 for storage failures', async () => {
    vi.mocked(Launch.findOne).mockReturnValue({ lean: async () => null } as never);
    const missing = response();
    await getHolders(request(), missing as unknown as Response, vi.fn());
    expect(missing.status).toHaveBeenCalledWith(404);
    vi.mocked(Launch.findOne).mockReturnValue({
      lean: async () => {
        throw new Error('storage down');
      },
    } as never);
    const failed = response();
    await getHolders(request(), failed as unknown as Response, vi.fn());
    expect(failed.status).toHaveBeenCalledWith(503);
  });
});
