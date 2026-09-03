import type { Types } from 'mongoose';

import GitHubDataSnapshot from '../../models/GitHubDataSnapshot.js';
import type { GitHubUser } from '../../types/integration/github.js';
import GitHubRepositoryFact from '../../models/GitHubRepositoryFact.js';
import type {
  GitHubContributionCollectionResponse,
  GitHubContributionPeriodRecord,
  GitHubContributionRange,
  GitHubContributionsQueryData,
  GitHubDataMetrics,
  GitHubDataSnapshotDocument,
  GitHubGraphQLResponse,
  GitHubRepositoriesQueryData,
  GitHubRepositoryNode,
} from '../../types/reputation/github.js';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
const GITHUB_DATA_VERSION = 'github-data-v1';
const MILLISECONDS_PER_DAY = 86_400_000;
const postGitHubGraphQL = async <T>(
  accessToken: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> => {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'lumenrise-api',
    },
    body: JSON.stringify({ query, variables }),
  });
  const result = (await response.json()) as GitHubGraphQLResponse<T>;

  if (!response.ok || result.errors?.length || !result.data) {
    throw new Error(result.errors?.[0]?.message ?? 'GitHub GraphQL request failed');
  }

  return result.data;
};
const createContributionRanges = (accountCreatedAt: Date, collectedAt: Date) => {
  const ranges: GitHubContributionRange[] = [];

  for (
    let year = accountCreatedAt.getUTCFullYear();
    year <= collectedAt.getUTCFullYear();
    year += 1
  ) {
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1) - 1);
    const from = year === accountCreatedAt.getUTCFullYear() ? accountCreatedAt : yearStart;
    const to = year === collectedAt.getUTCFullYear() ? collectedAt : yearEnd;

    ranges.push({ key: `year_${year}`, from, to });
  }

  for (const days of [30, 90, 365]) {
    ranges.push({
      key: `last_${days}_days`,
      from: new Date(collectedAt.getTime() - days * MILLISECONDS_PER_DAY),
      to: collectedAt,
    });
  }

  return ranges;
};
const collectContributionPeriods = async (
  username: string,
  accessToken: string,
  ranges: GitHubContributionRange[],
): Promise<GitHubContributionPeriodRecord[]> => {
  const definitions = ranges
    .map((_range, index) => `$from${index}: DateTime!, $to${index}: DateTime!`)
    .join(', ');
  const selections = ranges
    .map(
      (_range, index) => `
        p${index}: contributionsCollection(from: $from${index}, to: $to${index}) {
          contributionCalendar { totalContributions }
          totalCommitContributions
          totalIssueContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          totalRepositoryContributions
          restrictedContributionsCount
          totalRepositoriesWithContributedCommits
          totalRepositoriesWithContributedIssues
          totalRepositoriesWithContributedPullRequests
          totalRepositoriesWithContributedPullRequestReviews
        }
      `,
    )
    .join('\n');
  const query = `
    query GitHubContributions($login: String!, ${definitions}) {
      user(login: $login) {
        ${selections}
      }
    }
  `;
  const variables: Record<string, unknown> = { login: username };

  ranges.forEach((range, index) => {
    variables[`from${index}`] = range.from.toISOString();
    variables[`to${index}`] = range.to.toISOString();
  });

  const data = await postGitHubGraphQL<GitHubContributionsQueryData>(accessToken, query, variables);

  if (!data.user) {
    throw new Error('GitHub user was not found while collecting contributions');
  }

  return ranges.map((range, index) => {
    const collection = data.user?.[`p${index}`];

    if (!collection) {
      throw new Error('GitHub contribution period is missing');
    }

    return mapContributionPeriod(range, collection);
  });
};
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
const collectAllRepositories = async (
  username: string,
  accessToken: string,
): Promise<GitHubRepositoryNode[]> => {
  const query = `
    query GitHubRepositories($login: String!, $after: String) {
      user(login: $login) {
        repositories(
          first: 100
          after: $after
          ownerAffiliations: OWNER
          privacy: PUBLIC
          orderBy: { field: UPDATED_AT, direction: DESC }
        ) {
          nodes {
            databaseId
            nameWithOwner
            isFork
            isArchived
            stargazerCount
            forkCount
            watchers(first: 1) { totalCount }
            issues(first: 1, states: OPEN) { totalCount }
            pullRequests(first: 1, states: MERGED) { totalCount }
            releases(first: 1) { totalCount }
            createdAt
            pushedAt
            primaryLanguage { name }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  `;
  const repositories: GitHubRepositoryNode[] = [];

  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data: GitHubRepositoriesQueryData = await postGitHubGraphQL(accessToken, query, {
      login: username,
      after,
    });

    if (!data.user) {
      throw new Error('GitHub user was not found while collecting repositories');
    }

    repositories.push(...data.user.repositories.nodes);
    hasNextPage = data.user.repositories.pageInfo.hasNextPage;
    after = data.user.repositories.pageInfo.endCursor;
  }

  return repositories;
};
const sumYearlyContribution = (
  periods: GitHubContributionPeriodRecord[],
  field: keyof GitHubContributionPeriodRecord,
): number =>
  periods
    .filter((period) => period.key.startsWith('year_'))
    .reduce((total, period) => total + Number(period[field]), 0);
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
const storeRepositoryFacts = async (
  snapshotId: Types.ObjectId,
  identityId: Types.ObjectId,
  providerAccountId: string,
  repositories: GitHubRepositoryNode[],
  collectedAt: Date,
): Promise<void> => {
  const facts = repositories.map((repository) => ({
    snapshot: snapshotId,
    identity: identityId,
    providerAccountId,
    repositoryId: repository.databaseId.toString(),
    nameWithOwner: repository.nameWithOwner,
    isFork: repository.isFork,
    isArchived: repository.isArchived,
    starCount: repository.stargazerCount,
    forkCount: repository.forkCount,
    watcherCount: repository.watchers.totalCount,
    openIssueCount: repository.issues.totalCount,
    mergedPullRequestCount: repository.pullRequests.totalCount,
    releaseCount: repository.releases.totalCount,
    primaryLanguage: repository.primaryLanguage?.name ?? null,
    repositoryCreatedAt: new Date(repository.createdAt),
    lastPushedAt: repository.pushedAt ? new Date(repository.pushedAt) : null,
    collectedAt,
  }));

  for (let index = 0; index < facts.length; index += 500) {
    await GitHubRepositoryFact.insertMany(facts.slice(index, index + 500));
  }
};
const collectGitHubData = async (
  identityId: Types.ObjectId,
  externalAccountId: Types.ObjectId,
  user: GitHubUser,
  accessToken: string,
  collectedAt = new Date(),
): Promise<GitHubDataSnapshotDocument> => {
  const ranges = createContributionRanges(new Date(user.created_at), collectedAt);
  const [periodsResult, repositoriesResult] = await Promise.allSettled([
    collectContributionPeriods(user.login, accessToken, ranges),
    collectAllRepositories(user.login, accessToken),
  ]);
  const periods = periodsResult.status === 'fulfilled' ? periodsResult.value : [];
  const repositories = repositoriesResult.status === 'fulfilled' ? repositoriesResult.value : [];
  const status =
    periodsResult.status === 'fulfilled' && repositoriesResult.status === 'fulfilled'
      ? 'complete'
      : 'partial';
  const metrics = buildMetrics(user, repositories, periods, collectedAt);
  const snapshot = await GitHubDataSnapshot.create({
    identity: identityId,
    externalAccount: externalAccountId,
    providerAccountId: user.id.toString(),
    username: user.login,
    status,
    dataVersion: GITHUB_DATA_VERSION,
    coverage: {
      profile: true,
      contributions: periodsResult.status === 'fulfilled',
      repositories: repositoriesResult.status === 'fulfilled',
    },
    metrics,
    contributionPeriods: periods,
    collectedAt,
  });

  await storeRepositoryFacts(
    snapshot._id,
    identityId,
    user.id.toString(),
    repositories,
    collectedAt,
  );

  return snapshot;
};

export { buildMetrics, collectAllRepositories, collectGitHubData, createContributionRanges };
