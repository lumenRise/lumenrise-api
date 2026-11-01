import getStatsTradePage from './getStatsTradePage';
import statsScopes from '../../constants/stats/scopes';
import type { StatsTrades, StatsTradeQuery } from '../../types/stats/activity';

const getStatsTrades = async (query: StatsTradeQuery, now: Date): Promise<StatsTrades> => {
  const groups = await Promise.all(
    statsScopes.map((scope) => getStatsTradePage(scope, query, now)),
  );

  const result: StatsTrades = { currency: 'USDC', limit: query.limit, chains: [], combined: [] };

  for (const group of groups) {
    if (group.chain === 'all') {
      result.combined.push(group);

      continue;
    }

    result.chains.push(group);
  }

  return result;
};

export default getStatsTrades;
