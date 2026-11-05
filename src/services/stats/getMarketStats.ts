import Identity from '../../models/Identity';
import type { MarketStats } from '../../types/stats/market';
import requestDomainRead from '../messaging/requestDomainRead';

const getMarketStats = async (now: Date): Promise<MarketStats> => {
  const userCount = await Identity.countDocuments({ status: 'active', deletedAt: null });

  return requestDomainRead<MarketStats>('launch', 'stats.market', {
    now: now.toISOString(),
    userCount,
  });
};

export default getMarketStats;
