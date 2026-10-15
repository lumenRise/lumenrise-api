import { describe, expect, it } from 'vitest';

import initialLaunchPrice from '../src/utils/launch/initialLaunchPrice';

const config = (base: unknown, quote: unknown) => ({
  params: { curve: { virtual_base_reserve: base, virtual_quote_reserve: quote } },
});

describe('initial launch price', () => {
  it('matches contract current_price at zero sold, including upward rounding', () => {
    for (const [base, quote] of [
      [30_000_000n, 10_000_000n],
      [21_000_000n, 21_000_000n],
      [9_223_372_036_854_775_807n, 9_007_199_254_740_993n],
      [9_223_372_036_854_775_807n, 1n],
    ] as const) {
      // Use the unsimplified on-chain formula to verify the zero-sold reduction.
      const numerator = quote * base * 10_000_000n;
      const denominator = base * base;
      const expected = (numerator + denominator - 1n) / denominator;
      expect(initialLaunchPrice(config(base.toString(), quote.toString()))).toBe(String(expected));
    }
    expect(initialLaunchPrice(config('30000000', '10000000'))).toBe('3333334');
    expect(initialLaunchPrice(config(20, 1))).toBe('500000');
  });

  it('does not substitute a fixed price when reserves are missing or invalid', () => {
    expect(initialLaunchPrice(undefined)).toBeNull();
    expect(initialLaunchPrice({})).toBeNull();
    for (const invalid of [
      undefined,
      null,
      '0',
      '-1',
      '1.5',
      'bad',
      0,
      -1,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(initialLaunchPrice(config(invalid, '1'))).toBeNull();
      expect(initialLaunchPrice(config('1', invalid))).toBeNull();
    }
  });
});
