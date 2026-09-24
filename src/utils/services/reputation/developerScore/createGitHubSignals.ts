import type { DeveloperSignalInput } from '../../../../types/reputation/scoring.js';
import type { GitHubDataSnapshotDocument } from '../../../../types/reputation/github.js';

const createGitHubSignals = (snapshot: GitHubDataSnapshotDocument): DeveloperSignalInput[] => {
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

export { createGitHubSignals };
