import type { GitHubContributionPeriodRecord } from '../../../../types/reputation/github.js';

const sumYearlyContribution = (
  periods: GitHubContributionPeriodRecord[],
  field: keyof GitHubContributionPeriodRecord,
): number =>
  periods
    .filter((period) => period.key.startsWith('year_'))
    .reduce((total, period) => total + Number(period[field]), 0);

export { sumYearlyContribution };
