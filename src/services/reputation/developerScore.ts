import type { Types } from 'mongoose';

import ExternalAccount from '../../models/ExternalAccount.js';
import ReputationSnapshot from '../../models/ReputationSnapshot.js';
import GitLabDataSnapshot from '../../models/GitLabDataSnapshot.js';
import GitHubDataSnapshot from '../../models/GitHubDataSnapshot.js';
import type { ReputationSnapshotDocument } from '../../types/reputation/model.js';
import type { GitLabDataSnapshotDocument } from '../../types/reputation/gitlab.js';
import type { GitHubDataSnapshotDocument } from '../../types/reputation/github.js';
import type {
  DeveloperReputationCalculation,
  DeveloperReputationSourceInput,
  DeveloperReputationStatus,
  DeveloperSignalInput,
} from '../../types/reputation/scoring.js';

const DEVELOPER_ALGORITHM_VERSION = 'developer-v1';
const round = (value: number, precision: number): number => {
  const multiplier = 10 ** precision;

  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
};
const normalizeDiminishingReturns = (rawValue: number, scale: number): number => {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error('Developer signal scale must be positive');
  }

  if (!Number.isFinite(rawValue)) {
    throw new Error('Developer signal value must be finite');
  }

  const value = Math.max(0, rawValue);

  return round(100 * (1 - Math.exp(-value / scale)), 4);
};
const calculateDeveloperScore = (
  inputs: DeveloperSignalInput[],
  status: DeveloperReputationStatus,
): DeveloperReputationCalculation => {
  if (inputs.some((input) => !Number.isFinite(input.baseWeight) || input.baseWeight <= 0)) {
    throw new Error('Developer signal weights must be positive');
  }

  const totalWeight = inputs.reduce((total, input) => total + input.baseWeight, 0);

  if (totalWeight <= 0) {
    throw new Error('Developer reputation requires at least one weighted signal');
  }

  const signals = inputs.map((input) => {
    const normalizedScore = normalizeDiminishingReturns(input.rawValue, input.scale);
    const weight = round(input.baseWeight / totalWeight, 6);
    const contribution = round(normalizedScore * weight, 4);

    return {
      provider: input.provider,
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

  return { status, score, signals };
};
const createGitHubSignals = (
  snapshot: GitHubDataSnapshotDocument,
): DeveloperSignalInput[] => {
  const signals: DeveloperSignalInput[] = [
    {
      provider: 'github',
      key: 'account_age_days',
      rawValue: snapshot.metrics.accountAgeDays,
      baseWeight: 0.12,
      scale: 730,
      observedAt: snapshot.collectedAt,
    },
    {
      provider: 'github',
      key: 'follower_count',
      rawValue: snapshot.metrics.followerCount,
      baseWeight: 0.04,
      scale: 50,
      observedAt: snapshot.collectedAt,
    },
  ];

  if (snapshot.coverage.repositories) {
    signals.push(
      {
        provider: 'github',
        key: 'original_repository_count',
        rawValue: snapshot.metrics.originalRepositoryCount,
        baseWeight: 0.14,
        scale: 12,
        observedAt: snapshot.collectedAt,
      },
      {
        provider: 'github',
        key: 'original_repository_stars',
        rawValue: snapshot.metrics.originalRepositoryStars,
        baseWeight: 0.1,
        scale: 100,
        observedAt: snapshot.collectedAt,
      },
    );
  }

  if (snapshot.coverage.contributions) {
    signals.push(
      {
        provider: 'github',
        key: 'all_time_commits',
        rawValue: snapshot.metrics.allTimeCommits,
        baseWeight: 0.2,
        scale: 500,
        observedAt: snapshot.collectedAt,
      },
      {
        provider: 'github',
        key: 'all_time_pull_requests',
        rawValue: snapshot.metrics.allTimePullRequests,
        baseWeight: 0.14,
        scale: 60,
        observedAt: snapshot.collectedAt,
      },
      {
        provider: 'github',
        key: 'all_time_pull_request_reviews',
        rawValue: snapshot.metrics.allTimePullRequestReviews,
        baseWeight: 0.1,
        scale: 80,
        observedAt: snapshot.collectedAt,
      },
      {
        provider: 'github',
        key: 'all_time_issues',
        rawValue: snapshot.metrics.allTimeIssues,
        baseWeight: 0.07,
        scale: 60,
        observedAt: snapshot.collectedAt,
      },
      {
        provider: 'github',
        key: 'active_year_count',
        rawValue: snapshot.metrics.activeYearCount,
        baseWeight: 0.09,
        scale: 4,
        observedAt: snapshot.collectedAt,
      },
    );
  }

  return signals;
};
const createGitLabSignals = (
  snapshot: GitLabDataSnapshotDocument,
): DeveloperSignalInput[] => {
  const signals: DeveloperSignalInput[] = [
    {
      provider: 'gitlab',
      key: 'account_age_days',
      rawValue: snapshot.metrics.accountAgeDays,
      baseWeight: 0.15,
      scale: 730,
      observedAt: snapshot.collectedAt,
    },
    {
      provider: 'gitlab',
      key: 'follower_count',
      rawValue: snapshot.metrics.followerCount,
      baseWeight: 0.05,
      scale: 50,
      observedAt: snapshot.collectedAt,
    },
  ];

  if (snapshot.coverage.projects) {
    signals.push(
      {
        provider: 'gitlab',
        key: 'owned_project_count',
        rawValue: snapshot.metrics.ownedProjectCount,
        baseWeight: 0.15,
        scale: 12,
        observedAt: snapshot.collectedAt,
      },
      {
        provider: 'gitlab',
        key: 'project_stars',
        rawValue: snapshot.metrics.projectStars,
        baseWeight: 0.1,
        scale: 100,
        observedAt: snapshot.collectedAt,
      },
    );
  }

  if (snapshot.coverage.contributions) {
    signals.push(
      {
        provider: 'gitlab',
        key: 'pushed_commit_count',
        rawValue: snapshot.metrics.pushedCommitCount,
        baseWeight: 0.2,
        scale: 500,
        observedAt: snapshot.collectedAt,
      },
      {
        provider: 'gitlab',
        key: 'contributed_project_count',
        rawValue: snapshot.metrics.contributedProjectCount,
        baseWeight: 0.12,
        scale: 15,
        observedAt: snapshot.collectedAt,
      },
    );
  }

  if (snapshot.coverage.associations) {
    signals.push(
      {
        provider: 'gitlab',
        key: 'reported_merge_request_count',
        rawValue: snapshot.metrics.reportedMergeRequestCount,
        baseWeight: 0.15,
        scale: 60,
        observedAt: snapshot.collectedAt,
      },
      {
        provider: 'gitlab',
        key: 'reported_issue_count',
        rawValue: snapshot.metrics.reportedIssueCount,
        baseWeight: 0.08,
        scale: 60,
        observedAt: snapshot.collectedAt,
      },
    );
  }

  return signals;
};
const calculateAndStoreDeveloperReputation = async (
  identityId: Types.ObjectId,
  calculatedAt = new Date(),
): Promise<ReputationSnapshotDocument> => {
  const accounts = await ExternalAccount.find({
    identity: identityId,
    provider: { $in: ['github', 'gitlab'] },
    status: 'connected',
  });
  const githubAccount = accounts.find((account) => account.provider === 'github');
  const gitlabAccount = accounts.find((account) => account.provider === 'gitlab');
  const [githubSnapshot, gitlabSnapshot] = await Promise.all([
    githubAccount
      ? GitHubDataSnapshot.findOne({ externalAccount: githubAccount._id }).sort({ collectedAt: -1 })
      : null,
    gitlabAccount
      ? GitLabDataSnapshot.findOne({ externalAccount: gitlabAccount._id }).sort({ collectedAt: -1 })
      : null,
  ]);
  const inputs: DeveloperSignalInput[] = [];
  const sources: DeveloperReputationSourceInput[] = [];

  if (githubSnapshot) {
    inputs.push(...createGitHubSignals(githubSnapshot));
    sources.push({
      provider: 'github',
      snapshot: githubSnapshot._id,
      dataVersion: githubSnapshot.dataVersion,
      collectedAt: githubSnapshot.collectedAt,
      status: githubSnapshot.status,
    });
  }

  if (gitlabSnapshot) {
    inputs.push(...createGitLabSignals(gitlabSnapshot));
    sources.push({
      provider: 'gitlab',
      snapshot: gitlabSnapshot._id,
      dataVersion: gitlabSnapshot.dataVersion,
      collectedAt: gitlabSnapshot.collectedAt,
      status: gitlabSnapshot.status,
    });
  }

  if (sources.length === 0) {
    return ReputationSnapshot.create({
      identity: identityId,
      category: 'developer',
      status: 'failed',
      algorithmVersion: DEVELOPER_ALGORITHM_VERSION,
      score: null,
      signals: [],
      sources: [],
      calculatedAt,
    });
  }

  const status =
    sources.length === accounts.length && sources.every((source) => source.status === 'complete')
      ? 'complete'
      : 'partial';
  const calculation = calculateDeveloperScore(inputs, status);

  return ReputationSnapshot.create({
    identity: identityId,
    category: 'developer',
    status: calculation.status,
    algorithmVersion: DEVELOPER_ALGORITHM_VERSION,
    score: calculation.score,
    signals: calculation.signals,
    sources: sources.map((source) => ({
      provider: source.provider,
      snapshot: source.snapshot,
      dataVersion: source.dataVersion,
      collectedAt: source.collectedAt,
    })),
    calculatedAt,
  });
};

export {
  DEVELOPER_ALGORITHM_VERSION,
  calculateAndStoreDeveloperReputation,
  calculateDeveloperScore,
  createGitHubSignals,
  createGitLabSignals,
  normalizeDiminishingReturns,
};
