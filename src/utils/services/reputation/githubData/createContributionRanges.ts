import type { GitHubContributionRange } from '../../../../types/reputation/github.js';
import { MILLISECONDS_PER_DAY } from '../../../../constants/services/reputation/githubData.js';

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

export { createContributionRanges };
