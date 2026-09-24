import { postGitHubGraphQL } from './postGitHubGraphQL.js';
import { mapContributionPeriod } from './mapContributionPeriod.js';
import type {
  GitHubContributionPeriodRecord,
  GitHubContributionRange,
  GitHubContributionsQueryData,
} from '../../../../types/reputation/github.js';

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

export { collectContributionPeriods };
