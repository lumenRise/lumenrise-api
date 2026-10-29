import { formatUnits } from 'viem';

import Launch from '../../models/Launch';
import LaunchTrade from '../../models/LaunchTrade';
import type { ProjectVolume } from '../../types/stats/volume';
import getLaunchScales from '../../utils/launch/getLaunchScales';

const getProjectVolume = async (
  network: 'testnet' | 'public',
  now: Date,
): Promise<ProjectVolume> => {
  const since = new Date(now.getTime() - 86_400_000);

  const launches = await Launch.find({ network })
    .select('chain contractId assetDecimals pairDecimals')
    .lean();

  const scales = new Map<string, number>();

  for (const launch of launches) {
    scales.set(
      `${launch.chain ?? 'stellar'}:${launch.contractId}`,
      getLaunchScales(launch).priceScale,
    );
  }

  const trades = LaunchTrade.find({ network, tradedAt: { $lte: now } })
    .select('chain contractId grossAmount tradedAt side')
    .lean()
    .cursor();

  let totalAmount = 0n;
  let recentAmount = 0n;
  let totalCount = 0;
  let recentCount = 0;
  let totalBuyCount = 0;
  let recentBuyCount = 0;

  try {
    for await (const trade of trades) {
      const scale = scales.get(`${trade.chain ?? 'stellar'}:${trade.contractId}`);

      if (scale === undefined || !/^\d+$/.test(trade.grossAmount)) {
        throw new Error('Trade has no valid launch denomination');
      }

      const amount = BigInt(trade.grossAmount) * 10n ** BigInt(18 - scale);
      const buy = trade.side === 'buy' ? 1 : 0;

      totalAmount += amount;
      totalCount += 1;
      totalBuyCount += buy;

      if (trade.tradedAt >= since) {
        recentAmount += amount;
        recentCount += 1;
        recentBuyCount += buy;
      }
    }
  } finally {
    await trades.close();
  }

  return {
    network,
    currency: 'USDC',
    multiplier: 2,
    asOf: now.toISOString(),
    volumeTotal: {
      amount: formatUnits(totalAmount * 2n, 18),
      tradeCount: totalCount,
      buyCount: totalBuyCount,
      sellCount: totalCount - totalBuyCount,
    },
    volume24h: {
      amount: formatUnits(recentAmount * 2n, 18),
      tradeCount: recentCount,
      buyCount: recentBuyCount,
      sellCount: recentCount - recentBuyCount,
    },
  };
};

export default getProjectVolume;
