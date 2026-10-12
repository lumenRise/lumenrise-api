import type { Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Launch from '../src/models/Launch';
import LaunchTrade from '../src/models/LaunchTrade';
import request from './helpers/createMarketRequest';
import response from './helpers/createMarketResponse';
import getChart from '../src/routes/launches/getChart';
import getTrades from '../src/routes/launches/getTrades';
import getMarket from '../src/routes/launches/getMarket';
import LaunchPriceSample from '../src/models/LaunchPriceSample';

vi.mock('../src/env', () => ({ default: { STELLAR_AUTH_NETWORK: 'testnet', LOG_LEVEL: 'silent', NODE_ENV: 'test' } }));

vi.mock('../src/models/Launch', () => ({ default: { findOne: vi.fn() } }));
vi.mock('../src/models/LaunchTrade', () => ({ default: { aggregate: vi.fn(), find: vi.fn() } }));
vi.mock('../src/models/LaunchPriceSample', () => ({ default: { aggregate: vi.fn(), findOne: vi.fn() } }));
const now = new Date('2026-10-11T00:00:00Z');
const launch = {
  asset: 'token',
  pair: 'pair',
  state: { sold: '100', quote_reserve: '200', buyer_count: 1 },
  stateObservedAt: now,
};
describe('submitted trades and observed price reads', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.mocked(Launch.findOne).mockReturnValue({ lean: async () => launch } as never);
    vi.mocked(LaunchPriceSample.findOne).mockReturnValue({
      sort: () => ({ lean: async () => ({ price: '12345678', sampledAt: now }) }),
    } as never);
  });
  afterEach(() => vi.useRealTimers());
  it('uses the recorded contract price without calculating a formula', async () => {
    vi.mocked(LaunchTrade.aggregate).mockResolvedValue([
      { tradeCount: 3, buyCount: 2, grossVolume: '9007199254740993', assetVolume: '20000000' },
    ]);
    const res = response();
    await getMarket(request(), res as unknown as Response, vi.fn());
    expect(res.json.mock.calls[0]![0].result).toMatchObject({
      currentPrice: '12345678',
      volume24h: { sellCount: 1, grossPairAmount: '9007199254740993' },
    });
    expect(res.json.mock.calls[0]![0].result).not.toHaveProperty('coverage');
  });
  it('does not fabricate a price when no contract observation exists', async () => {
    vi.mocked(LaunchPriceSample.findOne).mockReturnValue({ sort: () => ({ lean: async () => null }) } as never);
    vi.mocked(LaunchTrade.aggregate).mockResolvedValue([]);
    const res = response();
    await getMarket(request(), res as unknown as Response, vi.fn());
    expect(res.json.mock.calls[0]![0].result.currentPrice).toBeNull();
  });
  it('returns sample candles and a preceding price for a flat carry-forward', async () => {
    vi.mocked(LaunchPriceSample.aggregate).mockResolvedValue([
      {
        timestamp: now,
        firstObservedAt: now,
        lastObservedAt: now,
        open: '10000000',
        close: '22500000',
        high: '22500000'.padStart(39, '0'),
        low: '10000000'.padStart(39, '0'),
        count: 2,
      },
    ]);
    const res = response();
    await getChart(request({ range: '1W' }), res as unknown as Response, vi.fn());
    expect(res.json.mock.calls[0]![0].result).toMatchObject({
      intervalSeconds: 900,
      previousPrice: '12345678',
      interpolation: 'step',
      items: [expect.objectContaining({ high: '22500000', low: '10000000' })],
    });
    expect(res.json.mock.calls[0]![0].result).not.toHaveProperty('coverage');
  });
  it('rejects invalid queries and the removed execution chart', async () => {
    for (const [handler, query] of [
      [getChart, { kind: 'execution' }],
      [getChart, { range: 'bad' }],
      [getMarket, { network: ['testnet'] }],
      [getTrades, { cursor: 'garbage' }],
      [getTrades, { limit: '1000' }],
    ] as const) {
      const res = response();
      await handler(request(query), res as unknown as Response, vi.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(Launch.findOne).not.toHaveBeenCalled();
  });
  it('returns only the six trade fields while retaining stable pagination', async () => {
    const row = {
      tradedAt: now,
      ledger: 200,
      transactionIndex: 3,
      operationIndex: 0,
      priceSort: 'internal',
      transactionHash: 'hash',
      grossAmount: '500',
      assetAmount: '123',
      executionPrice: '40000000',
      trader: 'wallet',
      side: 'buy',
    };
    vi.mocked(LaunchTrade.find).mockReturnValue({
      sort: () => ({ limit: () => ({ lean: async () => [row, row] }) }),
    } as never);
    const res = response();
    await getTrades(request({ limit: '1' }), res as unknown as Response, vi.fn());
    const result = res.json.mock.calls[0]![0].result;
    expect(result.items).toEqual([
      {
        trader: 'wallet',
        tradedAt: now.toISOString(),
        asset: 'token',
        side: 'buy',
        assetAmount: '123',
        executionPrice: '40000000',
      },
    ]);
    expect(JSON.parse(Buffer.from(result.nextCursor, 'base64url').toString())).toEqual([now.toISOString(), 200, 3, 0]);
    await getTrades(request({ cursor: result.nextCursor }), response() as unknown as Response, vi.fn());
    expect(LaunchTrade.find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([{ tradedAt: now, ledger: 200, transactionIndex: 3, operationIndex: { $lt: 0 } }]),
      }),
    );
  });
});
