import { describe, expect, it } from 'vitest';

import {
  calculateDeveloperScore,
  normalizeDiminishingReturns,
} from '../../src/services/reputation/developerScore.js';

describe('developer reputation scoring', () => {
  it('uses monotonic diminishing returns without a raw-value cutoff', () => {
    const atScale = normalizeDiminishingReturns(100, 100);
    const aboveScale = normalizeDiminishingReturns(200, 100);
    const farAboveScale = normalizeDiminishingReturns(1_000, 100);

    expect(normalizeDiminishingReturns(0, 100)).toBe(0);
    expect(atScale).toBeCloseTo(63.2121, 4);
    expect(aboveScale).toBeGreaterThan(atScale);
    expect(farAboveScale).toBeGreaterThan(aboveScale);
    expect(farAboveScale).toBeLessThan(100);
  });

  it('normalizes available signal weights and exposes every contribution', () => {
    const observedAt = new Date('2026-09-23T12:00:00.000Z');
    const result = calculateDeveloperScore(
      [
        {
          provider: 'github',
          key: 'repositories',
          rawValue: 10,
          baseWeight: 0.25,
          scale: 10,
          observedAt,
        },
        {
          provider: 'gitlab',
          key: 'commits',
          rawValue: 100,
          baseWeight: 0.75,
          scale: 100,
          observedAt,
        },
      ],
      'complete',
    );

    expect(result.status).toBe('complete');
    expect(result.signals.map((signal) => signal.weight)).toEqual([0.25, 0.75]);
    expect(result.signals[0]).toMatchObject({
      normalization: 'diminishing_returns',
      scale: 10,
      baseWeight: 0.25,
    });
    expect(result.signals[0]?.contribution).toBeCloseTo(15.803, 3);
    expect(result.signals[1]?.contribution).toBeCloseTo(47.4091, 3);
    expect(result.score).toBe(63.21);
  });

  it('rejects an empty set of weighted signals', () => {
    expect(() => calculateDeveloperScore([], 'partial')).toThrow(
      'requires at least one weighted signal',
    );
  });
});
