import type { HydratedDocument, Types } from 'mongoose';

type GitHubDataStatus = 'complete' | 'partial';

interface GitHubGraphQLError {
  message: string;
}

interface GitHubGraphQLResponse<T> {
  data?: T;
  errors?: GitHubGraphQLError[];
}

interface GitHubContributionTotals {
  totalContributions: number;
  commitContributions: number;
  issueContributions: number;
  pullRequestContributions: number;
  pullRequestReviewContributions: number;
  repositoryContributions: number;
  restrictedContributions: number;
  repositoriesWithCommitContributions: number;
  repositoriesWithIssueContributions: number;
  repositoriesWithPullRequestContributions: number;
  repositoriesWithPullRequestReviewContributions: number;
}

interface GitHubContributionPeriodRecord extends GitHubContributionTotals {
  key: string;
  from: Date;
  to: Date;
}

interface GitHubContributionRange {
  key: string;
  from: Date;
  to: Date;
}

interface GitHubContributionCollectionResponse {
  contributionCalendar: { totalContributions: number };
  totalCommitContributions: number;
  totalIssueContributions: number;
  totalPullRequestContributions: number;
  totalPullRequestReviewContributions: number;
  totalRepositoryContributions: number;
  restrictedContributionsCount: number;
  totalRepositoriesWithContributedCommits: number;
  totalRepositoriesWithContributedIssues: number;
  totalRepositoriesWithContributedPullRequests: number;
  totalRepositoriesWithContributedPullRequestReviews: number;
}

interface GitHubContributionsQueryData {
  user: Record<string, GitHubContributionCollectionResponse> | null;
}

interface GitHubRepositoryNode {
  databaseId: number;
  nameWithOwner: string;
  isFork: boolean;
  isArchived: boolean;
  stargazerCount: number;
  forkCount: number;
  watchers: { totalCount: number };
  issues: { totalCount: number };
  pullRequests: { totalCount: number };
  releases: { totalCount: number };
  createdAt: string;
  pushedAt: string | null;
  primaryLanguage: { name: string } | null;
}

interface GitHubRepositoriesQueryData {
  user: {
    repositories: {
      nodes: GitHubRepositoryNode[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  } | null;
}

interface GitHubDataMetrics {
  accountAgeDays: number;
  followerCount: number;
  followingCount: number;
  publicGistCount: number;
  reportedPublicRepositoryCount: number;
  collectedRepositoryCount: number;
  originalRepositoryCount: number;
  forkRepositoryCount: number;
  archivedRepositoryCount: number;
  originalRepositoryStars: number;
  originalRepositoryForks: number;
  originalRepositoryWatchers: number;
  originalRepositoryOpenIssues: number;
  originalRepositoryMergedPullRequests: number;
  originalRepositoryReleases: number;
  allTimeContributions: number;
  allTimeCommits: number;
  allTimeIssues: number;
  allTimePullRequests: number;
  allTimePullRequestReviews: number;
  allTimeRepositoriesCreated: number;
  allTimeRestrictedContributions: number;
  activeYearCount: number;
}

interface GitHubDataCoverage {
  profile: boolean;
  contributions: boolean;
  repositories: boolean;
}

interface GitHubDataSnapshotRecord {
  identity: Types.ObjectId;
  externalAccount: Types.ObjectId;
  providerAccountId: string;
  username: string;
  status: GitHubDataStatus;
  dataVersion: string;
  coverage: GitHubDataCoverage;
  metrics: GitHubDataMetrics;
  contributionPeriods: GitHubContributionPeriodRecord[];
  collectedAt: Date;
  createdAt: Date;
}

interface GitHubRepositoryFactRecord {
  snapshot: Types.ObjectId;
  identity: Types.ObjectId;
  providerAccountId: string;
  repositoryId: string;
  nameWithOwner: string;
  isFork: boolean;
  isArchived: boolean;
  starCount: number;
  forkCount: number;
  watcherCount: number;
  openIssueCount: number;
  mergedPullRequestCount: number;
  releaseCount: number;
  primaryLanguage: string | null;
  repositoryCreatedAt: Date;
  lastPushedAt: Date | null;
  collectedAt: Date;
  createdAt: Date;
}

interface GitHubDataSnapshotResult {
  provider: 'github';
  status: GitHubDataStatus;
  dataVersion: string;
  username: string;
  coverage: GitHubDataCoverage;
  metrics: GitHubDataMetrics;
  contributionPeriods: Array<
    Omit<GitHubContributionPeriodRecord, 'from' | 'to'> & {
      from: string;
      to: string;
    }
  >;
  collectedAt: string;
}

interface GitHubRepositoryFactResult {
  repositoryId: string;
  nameWithOwner: string;
  isFork: boolean;
  isArchived: boolean;
  starCount: number;
  forkCount: number;
  watcherCount: number;
  openIssueCount: number;
  mergedPullRequestCount: number;
  releaseCount: number;
  primaryLanguage: string | null;
  repositoryCreatedAt: string;
  lastPushedAt: string | null;
}

interface GitHubRepositoriesResult {
  items: GitHubRepositoryFactResult[];
  nextCursor: string | null;
}

type GitHubDataSnapshotDocument = HydratedDocument<GitHubDataSnapshotRecord>;

export type {
  GitHubContributionCollectionResponse,
  GitHubContributionPeriodRecord,
  GitHubContributionRange,
  GitHubContributionsQueryData,
  GitHubDataMetrics,
  GitHubDataCoverage,
  GitHubDataSnapshotDocument,
  GitHubDataSnapshotRecord,
  GitHubDataSnapshotResult,
  GitHubDataStatus,
  GitHubGraphQLResponse,
  GitHubRepositoriesQueryData,
  GitHubRepositoriesResult,
  GitHubRepositoryFactRecord,
  GitHubRepositoryNode,
};
