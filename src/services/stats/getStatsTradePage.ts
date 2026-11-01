import { Types } from 'mongoose';
import { formatUnits } from 'viem';

import Launch from '../../models/Launch';
import LaunchTrade from '../../models/LaunchTrade';
import getLaunchScales from '../../utils/launch/getLaunchScales';
import type { StatsScope, StatsTradePage, StatsTradeQuery } from '../../types/stats/activity';

const getStatsTradePage = async (
  scope: StatsScope,
  query: StatsTradeQuery,
  now: Date,
): Promise<StatsTradePage> => {
  const after = query.cursors.get(scope.cursorKey);
  const asOf = after?.asOf ?? now;

  const rows = await LaunchTrade.find({
    ...(scope.chain === 'all' ? { chain: { $in: ['stellar', 'base'] } } : { chain: scope.chain }),
    network: scope.network,
    tradedAt: { $lte: asOf },
    ...(after
      ? {
          $or: [
            { tradedAt: { $lt: after.tradedAt } },
            { tradedAt: after.tradedAt, _id: { $lt: new Types.ObjectId(after.id) } },
          ],
        }
      : {}),
  })
    .sort({ tradedAt: -1, _id: -1 })
    .limit(query.limit + 1)
    .select(
      'chain network contractId transactionHash trader tradedAt side assetAmount grossAmount executionPrice',
    )
    .lean();

  const page = rows.slice(0, query.limit);

  const launches = page.length
    ? await Launch.find({
        $or: page.map((trade) => ({
          chain: trade.chain ?? 'stellar',
          network: trade.network,
          contractId: trade.contractId,
        })),
      })
        .select('chain network contractId slug metadata assetDecimals pairDecimals')
        .lean()
    : [];

  const launchMap = new Map<string, (typeof launches)[number]>();

  for (const launch of launches) {
    launchMap.set(`${launch.chain ?? 'stellar'}:${launch.network}:${launch.contractId}`, launch);
  }

  const result: StatsTradePage = {
    chain: scope.chain,
    network: scope.network,
    asOf: asOf.toISOString(),
    items: [],
    hasMore: rows.length > query.limit,
    nextCursor: null,
  };

  for (const trade of page) {
    const chain = trade.chain ?? 'stellar';
    const launch = launchMap.get(`${chain}:${trade.network}:${trade.contractId}`);

    if (
      !launch ||
      !/^\d+$/.test(trade.assetAmount) ||
      !/^\d+$/.test(trade.grossAmount) ||
      !/^\d+$/.test(trade.executionPrice)
    ) {
      throw new Error('Trade display data is invalid');
    }

    const scales = getLaunchScales(launch);

    result.items.push({
      id: trade._id.toString(),
      hash: trade.transactionHash,
      chain,
      network: trade.network,
      launch: {
        slug: launch.slug,
        name: launch.metadata.name,
        symbol: launch.metadata.symbol,
        logo: launch.metadata.logo,
      },
      trader: trade.trader,
      tradedAt: trade.tradedAt.toISOString(),
      side: trade.side,
      assetAmount: formatUnits(BigInt(trade.assetAmount), scales.amountScale),
      price: formatUnits(BigInt(trade.executionPrice), scales.priceScale),
      amount: formatUnits(BigInt(trade.grossAmount), scales.priceScale),
    });
  }

  const last = page.at(-1);

  if (result.hasMore && last) {
    result.nextCursor = Buffer.from(
      JSON.stringify([
        1,
        scope.cursorKey,
        asOf.toISOString(),
        last.tradedAt.toISOString(),
        last._id.toString(),
        'desc',
      ]),
    ).toString('base64url');
  }

  return result;
};

export default getStatsTradePage;
