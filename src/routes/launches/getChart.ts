import type { RequestHandler } from 'express';

import log from '../../logger';
import Launch from '../../models/Launch';
import type { ChartRange } from '../../types/launch/market';
import LaunchPriceSample from '../../models/LaunchPriceSample';
import parseMarketRequest from '../../utils/launch/parseMarketRequest';

const ranges = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, ALL: 0 };
const intervals = { '1D': 300, '1W': 900, '1M': 3600, '3M': 14_400, ALL: 86_400 };

const getChart: RequestHandler = async (req, res) => {
  const identity = parseMarketRequest(req);
  const range = req.query.range ?? '1D';

  if (
    !identity ||
    typeof range !== 'string' ||
    !Object.hasOwn(ranges, range) ||
    (req.query.kind !== undefined && req.query.kind !== 'sampled')
  ) {
    return res.status(400).json({ status: 'error', message: 'Invalid chart query', result: {} });
  }

  try {
    const launch = await Launch.findOne(identity).lean();

    if (!launch) {
      return res.status(404).json({ status: 'error', message: 'Launch not found', result: {} });
    }

    const now = new Date();
    const days = ranges[range as ChartRange];
    const since = days ? new Date(now.getTime() - days * 86_400_000) : new Date(0);

    const [first, last, previous] = await Promise.all([
      LaunchPriceSample.findOne(identity).sort({ sampledAt: 1 }).lean(),
      LaunchPriceSample.findOne(identity).sort({ ledger: -1, sampledAt: -1 }).lean(),
      LaunchPriceSample.findOne({ ...identity, sampledAt: { $lt: since } })
        .sort({ sampledAt: -1, ledger: -1 })
        .lean(),
    ]);

    const firstTime = first?.sampledAt ?? null;
    const lastTime = last?.sampledAt ?? null;
    // Keep every response below 1000 buckets, including ALL for old launches.
    const intervalSeconds = Math.max(
      intervals[range as ChartRange],
      days || !firstTime ? 0 : Math.ceil((now.getTime() - firstTime.getTime()) / 998_000),
    );

    const candles = await LaunchPriceSample.aggregate([
      { $match: { ...identity, sampledAt: { $gte: since, $lte: now } } },
      {
        $sort: {
          sampledAt: 1,
          ledger: 1,
        },
      },
      {
        $group: {
          _id: {
            $toDate: {
              $subtract: [
                { $toLong: '$sampledAt' },
                { $mod: [{ $toLong: '$sampledAt' }, intervalSeconds * 1000] },
              ],
            },
          },
          open: { $first: '$price' },
          close: { $last: '$price' },
          high: { $max: '$priceSort' },
          low: { $min: '$priceSort' },
          count: { $sum: 1 },
          firstObservedAt: { $first: '$sampledAt' },
          lastObservedAt: { $last: '$sampledAt' },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 1000 },
      {
        $project: {
          _id: 0,
          timestamp: '$_id',
          open: 1,
          close: 1,
          high: 1,
          low: 1,
          count: 1,
          firstObservedAt: 1,
          lastObservedAt: 1,
        },
      },
    ]);

    const items = candles.map((row) => ({
      ...row,
      timestamp: (row.timestamp as Date).toISOString(),
      firstObservedAt: (row.firstObservedAt as Date).toISOString(),
      lastObservedAt: (row.lastObservedAt as Date).toISOString(),
      high: BigInt(row.high).toString(),
      low: BigInt(row.low).toString(),
    }));

    res.set('Cache-Control', 'public, max-age=15');

    return res.json({
      status: 'success',
      message: 'Chart retrieved',
      result: {
        ...identity,
        asset: launch.asset,
        pair: launch.pair,
        range,
        intervalSeconds,
        priceScale: 7,
        amountScale: 7,
        priceType: 'marginal_before_fee',
        firstObservationAt: firstTime?.toISOString() ?? null,
        lastObservationAt: lastTime?.toISOString() ?? null,
        items,
        previousPrice: previous?.price ?? null,
        interpolation: 'step',
      },
    });
  } catch (error) {
    log.error({ error }, 'Chart read failed');
    return res
      .status(503)
      .json({ status: 'error', message: 'Chart is temporarily unavailable', result: {} });
  }
};

export default getChart;
