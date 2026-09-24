import type { DeveloperSignalInput } from '../../../../types/reputation/scoring.js';
import type { GitLabDataSnapshotDocument } from '../../../../types/reputation/gitlab.js';

const createGitLabSignals = (snapshot: GitLabDataSnapshotDocument): DeveloperSignalInput[] => {
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

export { createGitLabSignals };
