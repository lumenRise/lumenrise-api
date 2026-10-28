import type { RequestHandler } from 'express';

import log from '../../logger';
import Launch from '../../models/Launch';
import LaunchTrade from '../../models/LaunchTrade';
import LaunchPriceSample from '../../models/LaunchPriceSample';
import toLaunchVolume from '../../utils/launch/toLaunchVolume';
import parseMarketRequest from '../../utils/launch/parseMarketRequest';
import toPublicMarketIdentity from '../../utils/launch/toPublicMarketIdentity';
import buildLaunchVolumePipeline from '../../utils/launch/buildLaunchVolumePipeline';

const getMarket: RequestHandler = async (req, res): Promise<unknown> => {
  const identity = parseMarketRequest(req);

  if (!identity) {
    return res.status(400).json({ status: 'error', message: 'Invalid market query', result: {} });
  }

  try {
    const now = new Date();

    const [launch, price, totals] = await Promise.all([
      Launch.findOne(identity).lean(),
      LaunchPriceSample.findOne(identity).sort({ ledger: -1, sampledAt: -1 }).lean(),
      LaunchTrade.aggregate([{ $match: identity }, ...buildLaunchVolumePipeline(now)]),
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
        ...toPublicMarketIdentity(identity),
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
        volume24h: toLaunchVolume(total?.volume24h),
        volumeTotal: toLaunchVolume(total?.volumeTotal),
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
