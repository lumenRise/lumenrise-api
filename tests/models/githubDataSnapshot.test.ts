import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import GitHubDataSnapshot from '../../src/models/GitHubDataSnapshot.js';

describe('GitHubDataSnapshot model', () => {
  it('stores uncapped raw GitHub values', async () => {
    const snapshot = new GitHubDataSnapshot({
      identity: new Types.ObjectId(),
      externalAccount: new Types.ObjectId(),
      providerAccountId: '1',
      username: 'octocat',
      status: 'complete',
      dataVersion: 'github-data-v1',
      coverage: {
        profile: true,
        contributions: true,
        repositories: true,
      },
      collectedAt: new Date(),
      contributionPeriods: [],
      metrics: {
        accountAgeDays: 10_000,
        followerCount: 2_000_000,
        followingCount: 1_000,
        publicGistCount: 50_000,
        reportedPublicRepositoryCount: 200_000,
        collectedRepositoryCount: 200_000,
        originalRepositoryCount: 190_000,
        forkRepositoryCount: 10_000,
        archivedRepositoryCount: 5_000,
        originalRepositoryStars: 100_000_000,
        originalRepositoryForks: 20_000_000,
        originalRepositoryWatchers: 10_000_000,
        originalRepositoryOpenIssues: 5_000_000,
        originalRepositoryMergedPullRequests: 50_000_000,
        originalRepositoryReleases: 500_000,
        allTimeContributions: 1_000_000_000,
        allTimeCommits: 900_000_000,
        allTimeIssues: 10_000_000,
        allTimePullRequests: 20_000_000,
        allTimePullRequestReviews: 60_000_000,
        allTimeRepositoriesCreated: 100_000,
        allTimeRestrictedContributions: 10_000_000,
        activeYearCount: 50,
      },
    });

    await snapshot.validate();

    expect(snapshot.metrics.originalRepositoryStars).toBe(100_000_000);
    expect(snapshot.metrics.allTimeContributions).toBe(1_000_000_000);
  });

  it('indexes snapshots by identity and collection time', () => {
    expect(GitHubDataSnapshot.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { identity: 1, collectedAt: -1 },
          expect.objectContaining({ name: 'github_data_snapshots_identity_collected' }),
        ],
      ]),
    );
  });
});
