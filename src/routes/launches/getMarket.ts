import type { RequestHandler } from 'express';

import log from '../../logger';
import Launch from '../../models/Launch';
import LaunchTrade from '../../models/LaunchTrade';
import bondingPrice from '../../utils/launch/bondingPrice';
import LaunchTradeCursor from '../../models/LaunchTradeCursor';
import decimalInteger from '../../utils/launch/decimalInteger';
import toTradeCoverage from '../../utils/launch/toTradeCoverage';
import parseMarketRequest from '../../utils/launch/parseMarketRequest';

const getMarket: RequestHandler = async (req, res) => {
  const identity = parseMarketRequest(req);

  if (!identity) {
    return res.status(400).json({ status: 'error', message: 'Invalid market query', result: {} });
  }

  try {
    const now = new Date();
    const since = new Date(now.getTime() - 86_400_000);
    const [launch, cursor, totals] = await Promise.all([
      Launch.findOne(identity).lean(),
      LaunchTradeCursor.findOne(identity).lean(),
      LaunchTrade.aggregate([
        { $match: { ...identity, tradedAt: { $gte: since, $lte: now } } },
        {
          $group: {
            _id: null,
            tradeCount: { $sum: 1 },
            buyCount: { $sum: { $cond: [{ $eq: ['$side', 'buy'] }, 1, 0] } },
            grossVolume: { $sum: { $toDecimal: '$grossAmount' } },
            assetVolume: { $sum: { $toDecimal: '$assetAmount' } },
            creatorFees: { $sum: { $toDecimal: '$creatorFee' } },
          },
        },
        {
          $project: {
            _id: 0,
            tradeCount: 1,
            buyCount: 1,
            grossVolume: { $toString: '$grossVolume' },
            assetVolume: { $toString: '$assetVolume' },
            creatorFees: { $toString: '$creatorFees' },
          },
        },
      ]),
    ]);

    if (!launch) {
      return res.status(404).json({ status: 'error', message: 'Launch not found', result: {} });
    }

    const total = totals[0];
    const coverage = toTradeCoverage(cursor, now);

    res.set('Cache-Control', 'public, max-age=10');

    return res.json({
      status: 'success',
      message: 'Market retrieved',
      result: {
        ...identity,
        asset: launch.asset,
        pair: launch.pair,
        amountScale: 7,
        priceScale: 7,
        currentPrice: bondingPrice(launch.config, launch.state),
        priceType: 'marginal_before_fee',
        stateAsOfLedger: launch.stateAsOfLedger,
        stateObservedAt: launch.stateObservedAt.toISOString(),
        stateStale: now.getTime() - launch.stateObservedAt.getTime() > 60_000,
        curveReserve: launch.state.quote_reserve,
        netTokensSold: launch.state.sold,
        distinctBuyers: launch.state.buyer_count,
        volume24h: cursor
          ? {
              grossPairAmount: decimalInteger(total?.grossVolume ?? '0'),
              assetAmount: decimalInteger(total?.assetVolume ?? '0'),
              creatorFees: decimalInteger(total?.creatorFees ?? '0'),
              tradeCount: total?.tradeCount ?? 0,
              buyCount: total?.buyCount ?? 0,
              sellCount: (total?.tradeCount ?? 0) - (total?.buyCount ?? 0),
              partial:
                coverage.stale ||
                !coverage.caughtUp ||
                coverage.historyGap ||
                coverage.unclassifiedCount > 0 ||
                cursor.coverageFrom > since,
            }
          : null,
        holders: null,
        circulatingSupply: null,
        poolLiquidity: null,
        unavailable: {
          holders: 'holder_index_not_available',
          circulatingSupply: 'supply_index_not_available',
          poolLiquidity: 'curve_does_not_create_pool',
        },
        coverage,
      },
    });
  } catch (error) {
    log.error({ error }, 'Market read failed');
    return res
      .status(503)
      .json({ status: 'error', message: 'Market is temporarily unavailable', result: {} });
  }
};

export default getMarket;
