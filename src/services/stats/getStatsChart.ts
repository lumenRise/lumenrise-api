import requestDomainRead from '../messaging/requestDomainRead';
import type { StatsChart, StatsChartQuery } from '../../types/stats/activity';

const getStatsChart = async (query: StatsChartQuery, now: Date): Promise<StatsChart> => {
  return requestDomainRead<StatsChart>('launch', 'stats.chart', {
    query: { ...query, from: query.from.toISOString(), to: query.to.toISOString() },
    now: now.toISOString(),
  });
};

export default getStatsChart;
