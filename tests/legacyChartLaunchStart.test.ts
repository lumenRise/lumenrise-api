import type { Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Launch from '../src/models/Launch';
import request from './helpers/createMarketRequest';
import response from './helpers/createMarketResponse';
import getChart from '../src/routes/launches/getChart';
import LaunchPriceSample from '../src/models/LaunchPriceSample';

vi.mock('../src/env', () => ({
  default: { STELLAR_AUTH_NETWORK: 'testnet', LOG_LEVEL: 'silent', NODE_ENV: 'test' },
}));
vi.mock('../src/models/Launch', () => ({ default: { findOne: vi.fn() } }));
vi.mock('../src/models/LaunchPriceSample', () => ({
  default: { findOne: vi.fn(), aggregate: vi.fn() },
}));

const start = new Date('2026-10-14T12:00:00Z');
const now = new Date('2026-10-14T17:00:00Z');

describe('legacy chart candles from launch', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.mocked(Launch.findOne).mockReturnValue({
      lean: async () => ({
        asset: 'token',
        pair: 'pair',
        config: { params: { starts_at: String(start.getTime() / 1000) } },
      }),
    } as never);
    vi.mocked(LaunchPriceSample.findOne).mockReturnValue({
      sort: () => ({ lean: async () => null }),
    } as never);
    vi.mocked(LaunchPriceSample.aggregate).mockResolvedValue([]);
  });
  afterEach(() => vi.useRealTimers());

  it('includes every interval from launch even with no observations', async () => {
    const res = response();
    await getChart(request({ range: '1D' }), res as unknown as Response, vi.fn());
    const result = res.json.mock.calls[0]![0].result;
    expect(result.items).toHaveLength(61);
    expect(result.items[0]).toMatchObject({
      timestamp: start.toISOString(),
      open: '10000000',
      close: '10000000',
      count: 0,
      firstObservedAt: null,
      lastObservedAt: null,
    });
    expect(result.firstObservationAt).toBeNull();
  });

  it('switches to the observed price at 16:00 and carries it forward', async () => {
    const first = new Date('2026-10-14T16:00:00Z');
    const observation = { price: '25000000', sampledAt: first };
    vi.mocked(LaunchPriceSample.findOne)
      .mockReturnValueOnce({ sort: () => ({ lean: async () => observation }) } as never)
      .mockReturnValueOnce({ sort: () => ({ lean: async () => observation }) } as never);
    vi.mocked(LaunchPriceSample.aggregate).mockResolvedValue([
      {
        timestamp: first,
        open: '25000000',
        close: '25000000',
        high: '25000000',
        low: '25000000',
        count: 1,
        firstObservedAt: first,
        lastObservedAt: first,
      },
    ]);
    const res = response();
    await getChart(request({ range: '1D' }), res as unknown as Response, vi.fn());
    const result = res.json.mock.calls[0]![0].result;
    expect(result.items[47]).toMatchObject({ close: '10000000', count: 0 });
    expect(result.items[48]).toMatchObject({ open: '25000000', close: '25000000', count: 1 });
    expect(result.items[49]).toMatchObject({ open: '25000000', close: '25000000', count: 0 });
    expect(result.firstObservationAt).toBe(first.toISOString());
  });
});
