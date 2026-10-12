import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Launch from '../src/models/Launch';
import request from './helpers/createMarketRequest';
import LaunchTrade from '../src/models/LaunchTrade';
import response from './helpers/createMarketResponse';
import postTrade from '../src/routes/launches/postTrade';
import getLaunchRpc from '../src/services/launch/getLaunchRpc';
import LaunchPriceSample from '../src/models/LaunchPriceSample';
import readLaunchContract from '../src/services/launch/readLaunchContract';
import decodeTradeTransaction from '../src/utils/launch/decodeTradeTransaction';

vi.mock('../src/env', () => ({ default: { STELLAR_AUTH_NETWORK: 'testnet', LOG_LEVEL: 'silent', NODE_ENV: 'test' } }));

vi.mock('../src/models/Launch', () => ({ default: { findOne: vi.fn(), updateOne: vi.fn() } }));
vi.mock('../src/models/LaunchTrade', () => ({ default: { findOne: vi.fn(), updateOne: vi.fn() } }));
vi.mock('../src/models/LaunchPriceSample', () => ({ default: { updateOne: vi.fn() } }));
vi.mock('../src/utils/launch/decodeTradeTransaction', () => ({ default: vi.fn() }));
vi.mock('../src/services/launch/getLaunchRpc', () => ({ default: vi.fn() }));
vi.mock('../src/services/launch/readLaunchContract', () => ({ default: vi.fn() }));
const hash = 'a'.repeat(64);
const trade = {
  transactionHash: hash,
  ledger: 100,
  trader: 'wallet',
  tradedAt: new Date('2026-10-08T08:47:42Z'),
  side: 'buy',
  assetAmount: '100000000',
  executionPrice: '10055866',
};
const server = { getTransaction: vi.fn() };
const submit = (body: unknown = { transactionHash: hash }) => ({ ...request(), body }) as Request;
describe('client hash submission', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(Launch.findOne).mockReturnValue({
      lean: async () => ({ asset: 'token', pair: 'pair', config: { params: { ends_at: '1' } } }),
    } as never);
    vi.mocked(LaunchTrade.findOne).mockReturnValue({ lean: async () => null } as never);
    vi.mocked(getLaunchRpc).mockResolvedValue(server as never);
    server.getTransaction.mockResolvedValue({ status: 'SUCCESS' });
    vi.mocked(decodeTradeTransaction).mockReturnValue(trade as never);
    vi.mocked(readLaunchContract).mockImplementation(async (_s, _id, method) =>
      method === 'get_state'
        ? { value: { sold: 100000000n, graduated: false }, ledger: 101 }
        : { value: 10112044n, ledger: 102 },
    );
  });
  it('validates the hash before accessing the database or RPC', async () => {
    const res = response();
    await postTrade(submit({ transactionHash: 'no' }), res as unknown as Response, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Launch.findOne).not.toHaveBeenCalled();
  });
  it('records a verified trade and the separate post-trade contract price', async () => {
    const res = response();
    await postTrade(submit(), res as unknown as Response, vi.fn());
    expect(server.getTransaction).toHaveBeenCalledWith(hash);
    expect(LaunchTrade.updateOne).toHaveBeenCalledWith(expect.anything(), { $setOnInsert: trade }, { upsert: true });
    expect(LaunchPriceSample.updateOne).toHaveBeenCalledWith(
      expect.anything(),
      { $setOnInsert: expect.objectContaining({ ledger: 102, price: '10112044' }) },
      { upsert: true },
    );
    expect(res.json.mock.calls[0]![0].result.trade).toEqual({
      trader: 'wallet',
      tradedAt: trade.tradedAt.toISOString(),
      asset: 'token',
      side: 'buy',
      assetAmount: '100000000',
      executionPrice: '10055866',
    });
    expect(Launch.updateOne).toHaveBeenCalledWith(expect.objectContaining({ stateAsOfLedger: { $lte: 101 } }), {
      $set: expect.objectContaining({ nextStatePollAt: expect.any(Date) }),
    });
  });
  it('does not re-read an already completed hash', async () => {
    vi.mocked(LaunchTrade.findOne).mockReturnValue({
      lean: async () => ({ ...trade, priceRecordedAt: new Date() }),
    } as never);
    const res = response();
    await postTrade(submit(), res as unknown as Response, vi.fn());
    expect(getLaunchRpc).not.toHaveBeenCalled();
    expect(res.json.mock.calls[0]![0].status).toBe('success');
  });
  it('asks the client to retry a pending transaction and rejects a non-trade', async () => {
    server.getTransaction.mockResolvedValueOnce({ status: 'NOT_FOUND' });
    const pending = response();
    await postTrade(submit(), pending as unknown as Response, vi.fn());
    expect(pending.status).toHaveBeenCalledWith(202);
    expect(LaunchTrade.updateOne).not.toHaveBeenCalled();
    vi.mocked(decodeTradeTransaction).mockReturnValue(null);
    const rejected = response();
    await postTrade(submit(), rejected as unknown as Response, vi.fn());
    expect(rejected.status).toHaveBeenCalledWith(400);
    expect(LaunchTrade.updateOne).not.toHaveBeenCalled();
  });
  it('retries a failed price read without losing or refetching the verified trade', async () => {
    vi.mocked(readLaunchContract).mockRejectedValueOnce(new Error('RPC down'));
    const failed = response();
    await postTrade(submit(), failed as unknown as Response, vi.fn());
    expect(failed.status).toHaveBeenCalledWith(503);
    expect(LaunchTrade.updateOne).toHaveBeenCalledTimes(1);
    vi.mocked(LaunchTrade.findOne).mockReturnValue({ lean: async () => trade } as never);
    const retried = response();
    await postTrade(submit(), retried as unknown as Response, vi.fn());
    expect(server.getTransaction).toHaveBeenCalledTimes(1);
    expect(retried.json.mock.calls[0]![0].status).toBe('success');
  });
  it.each([
    { sold: 0n, graduated: false },
    { sold: 100n, graduated: true },
  ])('stops periodic polling for terminal state', async (state) => {
    vi.mocked(readLaunchContract).mockImplementation(async (_s, _id, method) => ({
      value: method === 'get_state' ? state : 10000000n,
      ledger: 102,
    }));
    await postTrade(submit(), response() as unknown as Response, vi.fn());
    expect(Launch.updateOne).toHaveBeenCalledWith(expect.anything(), {
      $set: expect.objectContaining({ nextStatePollAt: null }),
    });
  });
  it('does not sample an RPC state older than the confirmed transaction', async () => {
    vi.mocked(readLaunchContract).mockResolvedValue({ value: 1n, ledger: 99 });
    const res = response();
    await postTrade(submit(), res as unknown as Response, vi.fn());
    expect(res.status).toHaveBeenCalledWith(503);
    expect(LaunchPriceSample.updateOne).not.toHaveBeenCalled();
  });
});
