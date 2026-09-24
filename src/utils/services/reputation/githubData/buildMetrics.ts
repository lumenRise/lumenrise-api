import { sumYearlyContribution } from './sumYearlyContribution.js';
import type { GitHubUser } from '../../../../types/integration/github.js';
import { MILLISECONDS_PER_DAY } from '../../../../constants/services/reputation/githubData.js';
import type {
  GitHubContributionPeriodRecord,
  GitHubDataMetrics,
  GitHubRepositoryNode,
} from '../../../../types/reputation/github.js';

const buildMetrics = (
  user: GitHubUser,
  repositories: GitHubRepositoryNode[],
  periods: GitHubContributionPeriodRecord[],
  collectedAt: Date,
): GitHubDataMetrics => {
  const originalRepositories = repositories.filter((repository) => !repository.isFork);

  const accountAgeDays = Math.max(
    0,
    Math.floor(
      (collectedAt.getTime() - new Date(user.created_at).getTime()) / MILLISECONDS_PER_DAY,
    ),
  );

  const sumOriginal = (value: (repository: GitHubRepositoryNode) => number): number =>
    originalRepositories.reduce((total, repository) => total + value(repository), 0);

  return {
    accountAgeDays,
    followerCount: user.followers,
    followingCount: user.following,
    publicGistCount: user.public_gists,
    reportedPublicRepositoryCount: user.public_repos,
    collectedRepositoryCount: repositories.length,
    originalRepositoryCount: originalRepositories.length,
    forkRepositoryCount: repositories.filter((repository) => repository.isFork).length,
    archivedRepositoryCount: repositories.filter((repository) => repository.isArchived).length,
    originalRepositoryStars: sumOriginal((repository) => repository.stargazerCount),
    originalRepositoryForks: sumOriginal((repository) => repository.forkCount),
    originalRepositoryWatchers: sumOriginal((repository) => repository.watchers.totalCount),
    originalRepositoryOpenIssues: sumOriginal((repository) => repository.issues.totalCount),
    originalRepositoryMergedPullRequests: sumOriginal(
      (repository) => repository.pullRequests.totalCount,
    ),
    originalRepositoryReleases: sumOriginal((repository) => repository.releases.totalCount),
    allTimeContributions: sumYearlyContribution(periods, 'totalContributions'),
    allTimeCommits: sumYearlyContribution(periods, 'commitContributions'),
    allTimeIssues: sumYearlyContribution(periods, 'issueContributions'),
    allTimePullRequests: sumYearlyContribution(periods, 'pullRequestContributions'),
    allTimePullRequestReviews: sumYearlyContribution(periods, 'pullRequestReviewContributions'),
    allTimeRepositoriesCreated: sumYearlyContribution(periods, 'repositoryContributions'),
    allTimeRestrictedContributions: sumYearlyContribution(periods, 'restrictedContributions'),
    activeYearCount: periods.filter(
      (period) => period.key.startsWith('year_') && period.totalContributions > 0,
    ).length,
  };
};

export { buildMetrics };
