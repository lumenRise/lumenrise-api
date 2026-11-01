import { expect, it } from 'vitest';

import statsBucketStart from '../src/utils/stats/statsBucketStart';
import parseStatsChartQuery from '../src/utils/stats/parseStatsChartQuery';
import parseStatsTradeQuery from '../src/utils/stats/parseStatsTradeQuery';

it('validates per-group cursors, bounded chart ranges and UTC week boundaries', (): void => {
  const now = new Date('2026-11-01T12:00:00Z');

  expect(parseStatsTradeQuery({}, now)).toEqual({ limit: 20, cursors: new Map() });

  for (const limit of ['0', '101', '1.5', 'invalid', ['20'], {}]) {
    expect(parseStatsTradeQuery({ limit }, now)).toBeNull();
  }

  const cursor = Buffer.from(
    JSON.stringify([
      1,
      'stellarTestnetCursor',
      now.toISOString(),
      now.toISOString(),
      '000000000000000000000001',
      'desc',
    ]),
  ).toString('base64url');
  const parsed = parseStatsTradeQuery({ stellarTestnetCursor: cursor, limit: '100' }, now);

  expect(parsed?.limit).toBe(100);
  expect(parsed?.cursors.get('stellarTestnetCursor')).toEqual({
    id: '000000000000000000000001',
    tradedAt: now,
    asOf: now,
  });
  expect(parseStatsTradeQuery({ baseTestnetCursor: cursor }, now)).toBeNull();

  for (const value of [
    '',
    'bad',
    'a'.repeat(513),
    ['cursor'],
    Buffer.from('{}').toString('base64url'),
  ]) {
    expect(parseStatsTradeQuery({ stellarTestnetCursor: value }, now)).toBeNull();
  }

  for (const [asOf, tradedAt, id] of [
    ['invalid', now.toISOString(), '000000000000000000000001'],
    ['2026-11-02T00:00:00Z', now.toISOString(), '000000000000000000000001'],
    [now.toISOString(), '2026-11-02T00:00:00Z', '000000000000000000000001'],
    [now.toISOString(), now.toISOString(), 'invalid'],
  ]) {
    const invalid = Buffer.from(
      JSON.stringify([1, 'stellarTestnetCursor', asOf, tradedAt, id, 'desc']),
    ).toString('base64url');

    expect(parseStatsTradeQuery({ stellarTestnetCursor: invalid }, now)).toBeNull();
  }

  expect(parseStatsChartQuery({}, now)).toEqual({
    from: new Date('2026-10-02T12:00:00Z'),
    to: now,
    interval: 'day',
  });

  for (const query of [
    { interval: 'month' },
    { interval: ['day'] },
    { from: 'invalid' },
    { from: '2026-02-30T00:00:00Z' },
    { from: ['2026-10-31T00:00:00Z'] },
    { from: '2026-11-02T00:00:00Z' },
    { to: '2026-11-02T00:00:00Z' },
    { from: now.toISOString(), to: now.toISOString() },
    { from: '2025-01-01T00:00:00Z' },
    { from: '2026-08-01T00:00:00Z', interval: 'hour' },
  ]) {
    expect(parseStatsChartQuery(query, now)).toBeNull();
  }

  expect(new Date(statsBucketStart(now.getTime(), 'week')).toISOString()).toBe(
    '2026-10-26T00:00:00.000Z',
  );
  expect(new Date(statsBucketStart(now.getTime(), 'day')).toISOString()).toBe(
    '2026-11-01T00:00:00.000Z',
  );
  expect(new Date(statsBucketStart(now.getTime(), 'hour')).toISOString()).toBe(now.toISOString());
});
