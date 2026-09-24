import type {
  GitHubContributionCollectionResponse,
  GitHubContributionPeriodRecord,
  GitHubContributionRange,
} from '../../../../types/reputation/github.js';

const mapContributionPeriod = (
  range: GitHubContributionRange,
  collection: GitHubContributionCollectionResponse,
): GitHubContributionPeriodRecord => ({
  key: range.key,
  from: range.from,
  to: range.to,
  totalContributions: collection.contributionCalendar.totalContributions,
  commitContributions: collection.totalCommitContributions,
  issueContributions: collection.totalIssueContributions,
  pullRequestContributions: collection.totalPullRequestContributions,
  pullRequestReviewContributions: collection.totalPullRequestReviewContributions,
  repositoryContributions: collection.totalRepositoryContributions,
  restrictedContributions: collection.restrictedContributionsCount,
  repositoriesWithCommitContributions: collection.totalRepositoriesWithContributedCommits,
  repositoriesWithIssueContributions: collection.totalRepositoriesWithContributedIssues,
  repositoriesWithPullRequestContributions: collection.totalRepositoriesWithContributedPullRequests,
  repositoriesWithPullRequestReviewContributions:
    collection.totalRepositoriesWithContributedPullRequestReviews,
});

export { mapContributionPeriod };
