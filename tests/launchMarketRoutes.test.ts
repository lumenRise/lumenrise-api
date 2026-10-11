import type { Response } from 'express';
import { StrKey } from '@stellar/stellar-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Launch from '../src/models/Launch';
import request from './helpers/createMarketRequest';
import LaunchTrade from '../src/models/LaunchTrade';
import response from './helpers/createMarketResponse';
import getChart from '../src/routes/launches/getChart';
import getTrades from '../src/routes/launches/getTrades';
import getMarket from '../src/routes/launches/getMarket';
import bondingPrice from '../src/utils/launch/bondingPrice';
import LaunchPriceSample from '../src/models/LaunchPriceSample';
import LaunchTradeCursor from '../src/models/LaunchTradeCursor';
import decimalInteger from '../src/utils/launch/decimalInteger';

vi.mock('../src/models/Launch', () => ({ default: { findOne: vi.fn(), exists: vi.fn() } }));
vi.mock('../src/models/LaunchTrade', () => ({
  default: { aggregate: vi.fn(), find: vi.fn(), findOne: vi.fn() },
}));
vi.mock('../src/models/LaunchPriceSample', () => ({
  default: { aggregate: vi.fn(), findOne: vi.fn() },
}));
vi.mock('../src/models/LaunchTradeCursor', () => ({ default: { findOne: vi.fn() } }));

const contractId = StrKey.encodeContract(Buffer.alloc(32, 1));
const now = new Date('2026-10-11T00:00:00Z');
const config = {
  params: { curve: { virtual_base_reserve: '3000000000', virtual_quote_reserve: '3000000000' } },
};
const launch = {
  contractId,
  network: 'testnet',
  asset: contractId,
  pair: contractId,
  config,
  state: { sold: '1000000000', quote_reserve: '1500000000', buyer_count: 1 },
  stateObservedAt: now,
  stateAsOfLedger: 200,
};
const cursor = {
  nextLedger: 200,
  scannedThroughLedger: 200,
  scannedAt: now,
  coverageFrom: new Date('2026-10-01T00:00:00Z'),
  historyGap: false,
  unclassifiedCount: 0,
};
describe('market API and exact prices', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.mocked(Launch.findOne).mockReturnValue({ lean: async () => launch } as never);
    vi.mocked(Launch.exists).mockResolvedValue({ _id: 'launch' } as never);
    vi.mocked(LaunchTradeCursor.findOne).mockReturnValue({ lean: async () => cursor } as never);
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it('matches contract price rounding without losing precision', () => {
    expect(bondingPrice(config, { sold: '0' })).toBe('10000000');
    expect(bondingPrice(config, { sold: '1000000000' })).toBe('22500000');
    expect(bondingPrice(config, { sold: '3000000000' })).toBeNull();
    expect(decimalInteger('1.234567890123456789E+19')).toBe('12345678901234567890');
  });
  it('returns gross volume separately from fees and honest availability', async () => {
    vi.mocked(LaunchTrade.aggregate).mockResolvedValue([
      {
        tradeCount: 3,
        buyCount: 2,
        grossVolume: '9007199254740993',
        assetVolume: '20000000',
        creatorFees: '123',
      },
    ]);
    const res = response();
    await getMarket(request(), res as unknown as Response, vi.fn());
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        result: expect.objectContaining({
          currentPrice: '22500000',
          holders: null,
          poolLiquidity: null,
          volume24h: expect.objectContaining({
            grossPairAmount: '9007199254740993',
            sellCount: 1,
            partial: false,
          }),
        }),
      }),
    );
  });
  it('does not equate missing indexing with zero volume', async () => {
    vi.mocked(LaunchTradeCursor.findOne).mockReturnValue({ lean: async () => null } as never);
    vi.mocked(LaunchTrade.aggregate).mockResolvedValue([]);
    const res = response();
    await getMarket(request(), res as unknown as Response, vi.fn());
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ result: expect.objectContaining({ volume24h: null }) }),
    );
  });
  it('flags lagging or partial historical statistics', async () => {
    vi.mocked(LaunchTradeCursor.findOne).mockReturnValue({
      lean: async () => ({ ...cursor, scannedThroughLedger: 199 }),
    } as never);
    vi.mocked(LaunchTrade.aggregate).mockResolvedValue([]);
    const res = response();
    await getMarket(request(), res as unknown as Response, vi.fn());
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        result: expect.objectContaining({
          volume24h: expect.objectContaining({ partial: true }),
        }),
      }),
    );
  });
  it('returns sampled OHLC without inventing missing buckets', async () => {
    vi.mocked(LaunchPriceSample.findOne).mockReturnValue({
      sort: () => ({ lean: async () => ({ sampledAt: now }) }),
    } as never);
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
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        result: expect.objectContaining({
          intervalSeconds: 900,
          priceType: 'observed_marginal_before_fee',
          emptyBuckets: 'omitted',
          items: [
            expect.objectContaining({ high: '22500000', low: '10000000', grossVolume: null }),
          ],
        }),
      }),
    );
  });
  it('validates network, timeframe and pagination before querying', async () => {
    for (const [handler, query] of [
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
    expect(LaunchTrade.aggregate).not.toHaveBeenCalled();
  });
  it('paginates recent trades by chain order and hides storage fields', async () => {
    const row = {
      tradedAt: now,
      ledger: 200,
      transactionIndex: 3,
      operationIndex: 0,
      priceSort: 'internal',
      _id: 'internal',
      assetAmount: '123',
      trader: 'wallet',
    };
    vi.mocked(LaunchTrade.find).mockReturnValue({
      sort: () => ({ limit: () => ({ lean: async () => [row, row] }) }),
    } as never);
    const res = response();
    await getTrades(request({ limit: '1' }), res as unknown as Response, vi.fn());
    const result = res.json.mock.calls[0]![0].result;
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).not.toHaveProperty('priceSort');
    expect(result.items[0]).not.toHaveProperty('_id');
    expect(JSON.parse(Buffer.from(result.nextCursor, 'base64url').toString())).toEqual([
      now.toISOString(),
      200,
      3,
      0,
    ]);
    await getTrades(
      request({ cursor: result.nextCursor }),
      response() as unknown as Response,
      vi.fn(),
    );
    expect(LaunchTrade.find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        network: 'testnet',
        contractId,
        $or: expect.arrayContaining([
          { tradedAt: now, ledger: 200, transactionIndex: 3, operationIndex: { $lt: 0 } },
        ]),
      }),
    );
  });
});
