import { describe, expect, it } from 'vitest';

import moveCandle from '../src/utils/launch/moveCandle';
import candleStart from '../src/utils/launch/candleStart';
import type { ObservedCandle } from '../src/types/launch/chart';
import buildChartCandles from '../src/utils/launch/buildChartCandles';

describe('continuous observed price candles', () => {
  it('carries 100 through fifty empty minutes and includes it in the next candle extrema', () => {
    const start = new Date('2026-10-14T12:00:00Z');
    const starts = Array.from({ length: 51 }, (_, index) => moveCandle(start, '1m', index));
    const change = new Date('2026-10-14T12:50:20Z');
    const rows: ObservedCandle[] = [
      {
        timestamp: starts[50]!,
        open: '105',
        close: '105',
        high: '105',
        low: '105',
        count: 1,
        firstObservedAt: change,
        lastObservedAt: change,
      },
    ];
    const result = buildChartCandles('1m', starts, rows, '100', new Date('2026-10-14T12:50:30Z'));
    expect(result).toHaveLength(51);
    expect(
      result
        .slice(0, 50)
        .every((candle) => candle.open === '100' && candle.close === '100' && candle.count === 0),
    ).toBe(true);
    expect(result[50]).toMatchObject({
      open: '100',
      high: '105',
      low: '100',
      close: null,
      latestPrice: '105',
      complete: false,
    });
  });

  it('builds hourly OHLC from five observations and the opening price', () => {
    const start = new Date('2026-10-14T12:00:00Z');
    const result = buildChartCandles(
      '1h',
      [start],
      [
        {
          timestamp: start,
          open: '105',
          close: '108',
          high: '110',
          low: '102',
          count: 5,
          firstObservedAt: new Date('2026-10-14T12:10:00Z'),
          lastObservedAt: new Date('2026-10-14T12:55:00Z'),
        },
      ],
      '100',
      new Date('2026-10-14T13:00:00Z'),
    );
    expect(result[0]).toMatchObject({
      open: '100',
      close: '108',
      high: '110',
      low: '100',
      complete: true,
    });
  });

  it('uses an exact boundary observation as open without including the previous price', () => {
    const start = new Date('2026-10-14T12:00:00Z');
    const result = buildChartCandles(
      '1h',
      [start],
      [
        {
          timestamp: start,
          open: '105',
          close: '108',
          high: '108',
          low: '105',
          count: 2,
          firstObservedAt: start,
          lastObservedAt: new Date('2026-10-14T12:55:00Z'),
        },
      ],
      '100',
      new Date('2026-10-14T13:00:00Z'),
    );
    expect(result[0]).toMatchObject({ open: '105', low: '105' });
  });

  it('returns a partial monthly candle for a two-day launch with no invented close', () => {
    const start = new Date('2026-10-01T00:00:00Z');
    const first = new Date('2026-10-12T00:00:00Z');
    const result = buildChartCandles(
      '1M',
      [start],
      [
        {
          timestamp: start,
          open: '9007199254740993',
          close: '9007199254740994',
          high: '9007199254740994',
          low: '9007199254740993',
          count: 2,
          firstObservedAt: first,
          lastObservedAt: new Date('2026-10-13T00:00:00Z'),
        },
      ],
      null,
      new Date('2026-10-14T00:00:00Z'),
    );
    expect(result[0]).toMatchObject({
      partial: true,
      close: null,
      latestPrice: '9007199254740994',
      high: '9007199254740994',
    });
    expect(buildChartCandles('1M', [start], [], null, new Date())).toEqual([]);
  });

  it('aligns UTC weeks, 45-minute intervals, calendar quarters, half-years and leap years', () => {
    expect(candleStart(new Date('2026-10-14T12:59:00Z'), '45m').toISOString()).toBe(
      '2026-10-14T12:45:00.000Z',
    );
    expect(candleStart(new Date('2026-10-14T12:59:00Z'), '1w').toISOString()).toBe(
      '2026-10-12T00:00:00.000Z',
    );
    expect(candleStart(new Date('2026-10-14T12:59:00Z'), '3M').toISOString()).toBe(
      '2026-10-01T00:00:00.000Z',
    );
    expect(candleStart(new Date('2026-10-14T12:59:00Z'), '6M').toISOString()).toBe(
      '2026-07-01T00:00:00.000Z',
    );
    expect(moveCandle(new Date('2024-02-01T00:00:00Z'), '1M').toISOString()).toBe(
      '2024-03-01T00:00:00.000Z',
    );
    expect(moveCandle(new Date('2024-01-01T00:00:00Z'), '1y').toISOString()).toBe(
      '2025-01-01T00:00:00.000Z',
    );
  });
});
