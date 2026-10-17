import type { RequestHandler } from 'express';

import log from '../../logger';
import Launch from '../../models/Launch';
import LaunchTrade from '../../models/LaunchTrade';
import LaunchPriceSample from '../../models/LaunchPriceSample';
import decimalInteger from '../../utils/launch/decimalInteger';
import parseMarketRequest from '../../utils/launch/parseMarketRequest';

const getMarket: RequestHandler = async (req, res) => {
  const identity = parseMarketRequest(req);

  if (!identity) {
    return res.status(400).json({ status: 'error', message: 'Invalid market query', result: {} });
  }

  try {
    const now = new Date();
    const since = new Date(now.getTime() - 86_400_000);
    const [launch, price, totals] = await Promise.all([
      Launch.findOne(identity).lean(),
      LaunchPriceSample.findOne(identity).sort({ ledger: -1, sampledAt: -1 }).lean(),
      LaunchTrade.aggregate([
        { $match: { ...identity, tradedAt: { $gte: since, $lte: now } } },
        {
          $group: {
            _id: null,
            tradeCount: { $sum: 1 },
            buyCount: { $sum: { $cond: [{ $eq: ['$side', 'buy'] }, 1, 0] } },
            grossVolume: { $sum: { $toDecimal: '$grossAmount' } },
            assetVolume: { $sum: { $toDecimal: '$assetAmount' } },
          },
        },
        {
          $project: {
            _id: 0,
            tradeCount: 1,
            buyCount: 1,
            grossVolume: { $toString: '$grossVolume' },
            assetVolume: { $toString: '$assetVolume' },
          },
        },
      ]),
    ]);

    if (!launch) {
      return res.status(404).json({ status: 'error', message: 'Launch not found', result: {} });
    }

    const total = totals[0];

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
        currentPrice: price?.price ?? null,
        priceObservedAt: price?.sampledAt.toISOString() ?? null,
        priceType: 'marginal_before_fee',
        stateAsOfLedger: launch.stateAsOfLedger,
        stateObservedAt: launch.stateObservedAt.toISOString(),
        stateStale: now.getTime() - launch.stateObservedAt.getTime() > 960_000,
        curveReserve: launch.state.quote_reserve,
        netTokensSold: launch.state.sold,
        distinctBuyers: launch.state.buyer_count,
        volume24h: {
          grossPairAmount: decimalInteger(total?.grossVolume ?? '0'),
          assetAmount: decimalInteger(total?.assetVolume ?? '0'),
          tradeCount: total?.tradeCount ?? 0,
          buyCount: total?.buyCount ?? 0,
          sellCount: (total?.tradeCount ?? 0) - (total?.buyCount ?? 0),
        },
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
