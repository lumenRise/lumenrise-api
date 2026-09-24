import type { XDataSnapshotDocument } from '../../../../types/reputation/x.js';
import type { SocialSignalInput } from '../../../../types/reputation/socialScoring.js';

const createXSocialSignals = (snapshot: XDataSnapshotDocument): SocialSignalInput[] => {
  const observedAt = snapshot.collectedAt;
  const metrics = snapshot.metrics;

  const signals: SocialSignalInput[] = [
    {
      key: 'account_age_days',
      rawValue: metrics.accountAgeDays,
      baseWeight: 0.12,
      scale: 730,
      observedAt,
    },
    {
      key: 'follower_count',
      rawValue: metrics.followerCount,
      baseWeight: 0.12,
      scale: 500,
      observedAt,
    },
    {
      key: 'listed_count',
      rawValue: metrics.listedCount,
      baseWeight: 0.04,
      scale: 20,
      observedAt,
    },
    {
      key: 'reported_post_count',
      rawValue: metrics.reportedPostCount,
      baseWeight: 0.08,
      scale: 500,
      observedAt,
    },
  ];

  if (snapshot.coverage.posts) {
    signals.push(
      {
        key: 'active_day_count',
        rawValue: metrics.activeDayCount,
        baseWeight: 0.18,
        scale: 90,
        observedAt,
      },
      {
        key: 'original_post_count',
        rawValue: metrics.originalPostCount,
        baseWeight: 0.16,
        scale: 150,
        observedAt,
      },
      {
        key: 'reply_post_count',
        rawValue: metrics.replyPostCount,
        baseWeight: 0.1,
        scale: 100,
        observedAt,
      },
      {
        key: 'received_like_count',
        rawValue: metrics.receivedLikeCount,
        baseWeight: 0.08,
        scale: 1_000,
        observedAt,
      },
      {
        key: 'received_repost_count',
        rawValue: metrics.receivedRepostCount,
        baseWeight: 0.06,
        scale: 200,
        observedAt,
      },
      {
        key: 'received_reply_count',
        rawValue: metrics.receivedReplyCount,
        baseWeight: 0.06,
        scale: 200,
        observedAt,
      },
    );
  }

  return signals;
};

export { createXSocialSignals };
