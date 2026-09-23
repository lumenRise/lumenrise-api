import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import XDataSnapshot from '../../src/models/XDataSnapshot.js';
import {
  calculateSocialScore,
  createXSocialSignals,
  normalizeSocialSignal,
} from '../../src/services/reputation/socialScore.js';

const createSnapshot = (postsCollected: boolean) =>
  new XDataSnapshot({
    identity: new Types.ObjectId(),
    externalAccount: new Types.ObjectId(),
    providerAccountId: '42',
    username: 'developer',
    status: postsCollected ? 'complete' : 'partial',
    dataVersion: 'x-data-v1',
    coverage: { profile: true, posts: postsCollected },
    metrics: {
      accountAgeDays: 1_000,
      followerCount: 500,
      followingCount: 100,
      reportedPostCount: 1_000,
      listedCount: 20,
      profileLikeCount: 200,
      mediaCount: 50,
      collectedPostCount: postsCollected ? 1_000 : 0,
      originalPostCount: postsCollected ? 500 : 0,
      replyPostCount: postsCollected ? 200 : 0,
      repostCount: postsCollected ? 200 : 0,
      quotePostCount: postsCollected ? 100 : 0,
      activeDayCount: postsCollected ? 300 : 0,
      receivedRepostCount: postsCollected ? 500 : 0,
      receivedReplyCount: postsCollected ? 600 : 0,
      receivedLikeCount: postsCollected ? 5_000 : 0,
      receivedQuoteCount: postsCollected ? 100 : 0,
      receivedBookmarkCount: postsCollected ? 300 : 0,
      impressionCount: postsCollected ? 20_000 : 0,
    },
    activityFrom: null,
    activityTo: new Date('2026-09-23T12:00:00.000Z'),
    collectedAt: new Date('2026-09-23T12:00:00.000Z'),
  });

describe('social reputation scoring', () => {
  it('normalizes increasing raw values without an arbitrary count cutoff', () => {
    const atScale = normalizeSocialSignal(100, 100);
    const aboveScale = normalizeSocialSignal(200, 100);

    expect(normalizeSocialSignal(0, 100)).toBe(0);
    expect(atScale).toBeCloseTo(63.2121, 4);
    expect(aboveScale).toBeGreaterThan(atScale);
    expect(() => normalizeSocialSignal(-1, 100)).toThrow();
  });

  it('keeps every contribution and source metric explainable', () => {
    const inputs = createXSocialSignals(createSnapshot(true));
    const result = calculateSocialScore(inputs);

    expect(inputs).toHaveLength(10);
    expect(result.signals.map((signal) => signal.key)).toContain('active_day_count');
    expect(result.signals.every((signal) => signal.provider === 'x')).toBe(true);
    expect(result.signals.every((signal) => signal.normalization === 'diminishing_returns')).toBe(
      true,
    );
    expect(result.signals.reduce((total, signal) => total + signal.weight, 0)).toBeCloseTo(1, 5);
    expect(result.score).toBeCloseTo(
      result.signals.reduce((total, signal) => total + signal.contribution, 0),
      2,
    );
  });

  it('omits unavailable timeline signals and renormalizes profile weights', () => {
    const inputs = createXSocialSignals(createSnapshot(false));
    const result = calculateSocialScore(inputs);

    expect(inputs.map((input) => input.key)).toEqual([
      'account_age_days',
      'follower_count',
      'listed_count',
      'reported_post_count',
    ]);
    expect(result.signals.reduce((total, signal) => total + signal.weight, 0)).toBeCloseTo(1, 5);
    expect(result.signals.find((signal) => signal.key === 'account_age_days')?.weight).toBeCloseTo(
      1 / 3,
      5,
    );
  });
});
