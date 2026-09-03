import { describe, expect, it } from 'vitest';

import { calculateGitHubDeveloperSignals } from '../../src/services/reputation/developer.js';

const OBSERVED_AT = new Date('2026-09-22T12:00:00.000Z');

describe('GitHub developer reputation', () => {
  it('produces a fully explainable maximum score', () => {
    const signals = calculateGitHubDeveloperSignals(
      {
        accountAgeDays: 1_825,
        publicRepositoryCount: 40,
        recentPublicEventCount: 60,
        sampledOriginalRepositoryStars: 100,
      },
      OBSERVED_AT,
    );
    const score = signals.reduce((total, signal) => total + signal.contribution, 0);

    expect(score).toBe(100);
    expect(signals.map((signal) => signal.key)).toEqual([
      'account_age_days',
      'public_repository_count',
      'recent_public_event_count_first_100_30d',
      'original_repository_stars_first_100',
    ]);
  });

  it('rebalances weights when optional GitHub data is unavailable', () => {
    const signals = calculateGitHubDeveloperSignals(
      {
        accountAgeDays: 912.5,
        publicRepositoryCount: 20,
        recentPublicEventCount: null,
        sampledOriginalRepositoryStars: null,
      },
      OBSERVED_AT,
    );
    const score = signals.reduce((total, signal) => total + signal.contribution, 0);

    expect(signals).toHaveLength(2);
    expect(signals.every((signal) => signal.weight === 0.5)).toBe(true);
    expect(score).toBe(50);
  });

  it('caps individual signals instead of rewarding unbounded popularity', () => {
    const signals = calculateGitHubDeveloperSignals(
      {
        accountAgeDays: 10_000,
        publicRepositoryCount: 1_000,
        recentPublicEventCount: 1_000,
        sampledOriginalRepositoryStars: 1_000_000,
      },
      OBSERVED_AT,
    );

    expect(signals.every((signal) => signal.normalizedScore === 100)).toBe(true);
  });

  it('does not exceed 100 when one optional signal is unavailable', () => {
    const signals = calculateGitHubDeveloperSignals(
      {
        accountAgeDays: 10_000,
        publicRepositoryCount: 1_000,
        recentPublicEventCount: null,
        sampledOriginalRepositoryStars: 1_000_000,
      },
      OBSERVED_AT,
    );
    const score = signals.reduce((total, signal) => total + signal.contribution, 0);

    expect(score).toBeLessThanOrEqual(100);
  });
});
