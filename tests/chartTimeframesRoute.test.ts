import type { Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Launch from '../src/models/Launch';
import request from './helpers/createMarketRequest';
import response from './helpers/createMarketResponse';
import getChart from '../src/routes/launches/getChart';
import LaunchPriceSample from '../src/models/LaunchPriceSample';
import parseChartRequest from '../src/utils/launch/parseChartRequest';
import readChartTimeframe from '../src/services/launch/readChartTimeframe';

vi.mock('../src/env', () => ({
  default: { STELLAR_AUTH_NETWORK: 'testnet', LOG_LEVEL: 'silent', NODE_ENV: 'test' },
}));
vi.mock('../src/models/Launch', () => ({ default: { findOne: vi.fn() } }));
vi.mock('../src/models/LaunchPriceSample', () => ({
  default: { findOne: vi.fn(), aggregate: vi.fn() },
}));

const now = new Date('2026-10-14T12:50:30Z');

describe('multiple chart timeframes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.mocked(Launch.findOne).mockReturnValue({
      lean: async () => ({ asset: 'token', pair: 'pair' }),
    } as never);
    vi.mocked(LaunchPriceSample.findOne).mockReturnValue({
      sort: () => ({ lean: async () => null }),
    } as never);
    vi.mocked(LaunchPriceSample.aggregate).mockResolvedValue([]);
  });

  afterEach(() => vi.useRealTimers());

  it('returns exactly the requested series, including repeated parameter syntax', async () => {
    for (const timeframes of ['1m,1h', ['1m', '1h', '1m']]) {
      const res = response();
      await getChart(request({ timeframes }), res as unknown as Response, vi.fn());
      expect(
        res.json.mock.calls[0]![0].result.timeframes.map(
          (frame: { timeframe: string }) => frame.timeframe,
        ),
      ).toEqual(['1m', '1h']);
    }
  });

  it('returns the seven default series with no invented history', async () => {
    const res = response();
    await getChart(request(), res as unknown as Response, vi.fn());
    const frames = res.json.mock.calls[0]![0].result.timeframes;
    expect(frames.map((frame: { timeframe: string }) => frame.timeframe)).toEqual([
      '1h',
      '1d',
      '1w',
      '1M',
      '3M',
      '6M',
      '1y',
    ]);
    expect(frames.every((frame: { items: unknown[] }) => frame.items.length === 0)).toBe(true);
  });

  it('supports all twelve requested timeframes', () => {
    expect(
      parseChartRequest(request({ timeframes: '1m,5m,15m,45m,1h,4h,1d,1w,1M,3M,6M,1y' }))
        ?.timeframes,
    ).toHaveLength(12);
  });

  it('rejects invalid timeframes, mixed legacy options, invalid limits and future windows', async () => {
    for (const query of [
      { timeframes: '' },
      { timeframes: '2h' },
      { timeframes: { bad: '1m' } },
      { range: '1D', timeframes: '1h' },
      { limit: '1001' },
      { from: 'invalid' },
      { to: '2027-01-01T00:00:00Z' },
      { from: now.toISOString(), to: now.toISOString() },
    ]) {
      const res = response();
      await getChart(request(query), res as unknown as Response, vi.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(Launch.findOne).not.toHaveBeenCalled();
  });

  it('bounds long one-minute histories and provides an exclusive backwards cursor', async () => {
    vi.mocked(LaunchPriceSample.findOne).mockReturnValue({
      sort: () => ({ lean: async () => ({ price: '100' }) }),
    } as never);
    const parsed = parseChartRequest(request({ timeframes: '1m', limit: '3' }))!;
    const result = await readChartTimeframe('1m', parsed, new Date('2026-10-12T00:00:00Z'));
    expect(result.hasMore).toBe(true);
    expect(result.nextBefore).toBe('2026-10-14T12:48:00.000Z');
    expect(result.items.map((candle) => candle.close)).toEqual(['100', '100', null]);
    const older = parseChartRequest(
      request({ timeframes: '1m', limit: '3', to: result.nextBefore! }),
    )!;
    const page = await readChartTimeframe('1m', older, new Date('2026-10-12T00:00:00Z'));
    expect(page.items.at(-1)?.timestamp).toBe('2026-10-14T12:47:00.000Z');
    expect(page.items.at(-1)?.close).toBe('100');
  });

  it('returns a monthly candle for a launch with only two days of observations', async () => {
    const first = new Date('2026-10-12T00:00:00Z');
    vi.mocked(LaunchPriceSample.aggregate).mockResolvedValue([
      {
        timestamp: new Date('2026-10-01T00:00:00Z'),
        open: '100',
        close: '105',
        high: '105',
        low: '100',
        count: 2,
        firstObservedAt: first,
        lastObservedAt: new Date('2026-10-13T10:00:00Z'),
      },
    ]);
    const parsed = parseChartRequest(request({ timeframes: '1M' }))!;
    const result = await readChartTimeframe('1M', parsed, first);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      close: null,
      latestPrice: '105',
      partial: true,
      endsAt: '2026-11-01T00:00:00.000Z',
    });
    expect(result.hasMore).toBe(false);
  });
});
