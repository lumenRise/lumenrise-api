import type { Types } from 'mongoose';

import ReputationSnapshot from '../../models/ReputationSnapshot.js';
import { GITHUB_DEVELOPER_ALGORITHM_VERSION } from '../../constants/reputation.js';
import type {
  GitHubDeveloperMetrics,
  ReputationSignalInput,
  ReputationSignalRecord,
  ReputationSnapshotDocument,
  ReputationSnapshotStatus,
} from '../../types/reputation/model.js';

const roundScore = (value: number): number => Math.round(value * 100) / 100;
const roundWeight = (value: number): number => Math.round(value * 1_000_000) / 1_000_000;
const calculateGitHubDeveloperSignals = (
  metrics: GitHubDeveloperMetrics,
  observedAt: Date,
): ReputationSignalRecord[] => {
  const inputs: ReputationSignalInput[] = [
    {
      key: 'account_age_days',
      rawValue: metrics.accountAgeDays,
      scoreCap: 1_825,
      baseWeight: 0.25,
    },
    {
      key: 'public_repository_count',
      rawValue: metrics.publicRepositoryCount,
      scoreCap: 40,
      baseWeight: 0.25,
    },
  ];

  if (metrics.recentPublicEventCount !== null) {
    inputs.push({
      key: 'recent_public_event_count_first_100_30d',
      rawValue: metrics.recentPublicEventCount,
      scoreCap: 60,
      baseWeight: 0.3,
    });
  }

  if (metrics.sampledOriginalRepositoryStars !== null) {
    inputs.push({
      key: 'original_repository_stars_first_100',
      rawValue: metrics.sampledOriginalRepositoryStars,
      scoreCap: 100,
      baseWeight: 0.2,
    });
  }

  const availableWeight = inputs.reduce((total, input) => total + input.baseWeight, 0);

  return inputs.map((input) => {
    const normalizedScore = roundScore(Math.min(input.rawValue / input.scoreCap, 1) * 100);
    const weight = roundWeight(input.baseWeight / availableWeight);
    const contribution = roundScore(normalizedScore * weight);

    return {
      provider: 'github',
      key: input.key,
      rawValue: input.rawValue,
      normalizedScore,
      weight,
      contribution,
      observedAt,
    };
  });
};
const createGitHubDeveloperSnapshot = async (
  identityId: Types.ObjectId,
  metrics: GitHubDeveloperMetrics,
  calculatedAt = new Date(),
): Promise<ReputationSnapshotDocument> => {
  const status: ReputationSnapshotStatus =
    metrics.recentPublicEventCount === null || metrics.sampledOriginalRepositoryStars === null
      ? 'partial'
      : 'complete';
  const signals = calculateGitHubDeveloperSignals(metrics, calculatedAt);
  const score = roundScore(signals.reduce((total, signal) => total + signal.contribution, 0));

  return ReputationSnapshot.create({
    identity: identityId,
    category: 'developer',
    status,
    algorithmVersion: GITHUB_DEVELOPER_ALGORITHM_VERSION,
    score,
    signals,
    calculatedAt,
  });
};

export { calculateGitHubDeveloperSignals, createGitHubDeveloperSnapshot };
