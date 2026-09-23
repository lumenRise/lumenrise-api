import ExternalAccount from '../../models/ExternalAccount.js';
import ReputationSnapshot from '../../models/ReputationSnapshot.js';
import type { XDataSnapshotDocument } from '../../types/reputation/x.js';
import type { ReputationSnapshotDocument } from '../../types/reputation/model.js';
import type {
  SocialScoreCalculation,
  SocialSignalInput,
} from '../../types/reputation/socialScoring.js';

const SOCIAL_ALGORITHM_VERSION = 'social-v1';
const round = (value: number, precision: number): number => {
  const multiplier = 10 ** precision;

  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
};
const normalizeSocialSignal = (rawValue: number, scale: number): number => {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error('Social signal scale must be positive');
  }

  if (!Number.isFinite(rawValue) || rawValue < 0) {
    throw new Error('Social signal value must be finite and nonnegative');
  }

  return round(100 * (1 - Math.exp(-rawValue / scale)), 4);
};
const calculateSocialScore = (inputs: SocialSignalInput[]): SocialScoreCalculation => {
  if (inputs.some((input) => !Number.isFinite(input.baseWeight) || input.baseWeight <= 0)) {
    throw new Error('Social signal weights must be positive');
  }

  const totalWeight = inputs.reduce((total, input) => total + input.baseWeight, 0);

  if (totalWeight <= 0) {
    throw new Error('Social score requires at least one weighted signal');
  }

  const signals = inputs.map((input) => {
    const normalizedScore = normalizeSocialSignal(input.rawValue, input.scale);
    const weight = round(input.baseWeight / totalWeight, 6);
    const contribution = round(normalizedScore * weight, 4);

    return {
      provider: 'x' as const,
      key: input.key,
      rawValue: input.rawValue,
      normalization: 'diminishing_returns' as const,
      scale: input.scale,
      baseWeight: input.baseWeight,
      normalizedScore,
      weight,
      contribution,
      observedAt: input.observedAt,
    };
  });
  const score = round(
    signals.reduce((total, signal) => total + signal.contribution, 0),
    2,
  );

  return { score, signals };
};
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
const calculateAndStoreSocialReputation = async (
  snapshot: XDataSnapshotDocument,
  calculatedAt = new Date(),
): Promise<ReputationSnapshotDocument | null> => {
  const account = await ExternalAccount.findOne({
    _id: snapshot.externalAccount,
    identity: snapshot.identity,
    provider: 'x',
    status: 'connected',
  }).select('_id');

  if (!account) {
    return null;
  }

  const calculation = calculateSocialScore(createXSocialSignals(snapshot));
  const reputation = await ReputationSnapshot.create({
    identity: snapshot.identity,
    category: 'social',
    status: snapshot.status,
    algorithmVersion: SOCIAL_ALGORITHM_VERSION,
    score: calculation.score,
    signals: calculation.signals,
    sources: [
      {
        provider: 'x',
        snapshot: snapshot._id,
        dataVersion: snapshot.dataVersion,
        collectedAt: snapshot.collectedAt,
      },
    ],
    calculatedAt,
  });
  const stillConnected = await ExternalAccount.exists({
    _id: account._id,
    status: 'connected',
  });

  if (!stillConnected) {
    await ReputationSnapshot.deleteOne({ _id: reputation._id });

    return null;
  }

  return reputation;
};

export {
  SOCIAL_ALGORITHM_VERSION,
  calculateAndStoreSocialReputation,
  calculateSocialScore,
  createXSocialSignals,
  normalizeSocialSignal,
};
