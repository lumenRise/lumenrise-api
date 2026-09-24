import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import XDataSnapshot from '../../src/models/XDataSnapshot.js';

describe('XDataSnapshot model', () => {
  it('stores uncapped aggregate X values', async () => {
    const snapshot = new XDataSnapshot({
      identity: new Types.ObjectId(),
      externalAccount: new Types.ObjectId(),
      providerAccountId: '42',
      username: 'developer',
      status: 'complete',
      dataVersion: 'x-data-v1',
      coverage: {
        profile: true,
        posts: true,
      },
      metrics: {
        accountAgeDays: 10_000,
        followerCount: 2_000_000,
        followingCount: 100_000,
        reportedPostCount: 1_000_000_000,
        listedCount: 500_000,
        profileLikeCount: 1_000_000_000,
        mediaCount: 100_000_000,
        collectedPostCount: 3_200,
        originalPostCount: 2_000,
        replyPostCount: 500,
        repostCount: 500,
        quotePostCount: 200,
        activeDayCount: 2_000,
        receivedRepostCount: 1_000_000_000,
        receivedReplyCount: 1_000_000_000,
        receivedLikeCount: 1_000_000_000,
        receivedQuoteCount: 1_000_000_000,
        receivedBookmarkCount: 1_000_000_000,
        impressionCount: 100_000_000_000,
      },
      activityFrom: new Date('2020-01-01T00:00:00.000Z'),
      activityTo: new Date('2026-09-23T00:00:00.000Z'),
      collectedAt: new Date('2026-09-23T00:00:00.000Z'),
    });

    await snapshot.validate();

    expect(snapshot.metrics.reportedPostCount).toBe(1_000_000_000);
    expect(snapshot.metrics.impressionCount).toBe(100_000_000_000);
  });

  it('indexes snapshots by account and collection time', () => {
    expect(XDataSnapshot.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { externalAccount: 1, collectedAt: -1 },
          expect.objectContaining({ name: 'x_data_snapshots_account_collected' }),
        ],
      ]),
    );
  });
});
