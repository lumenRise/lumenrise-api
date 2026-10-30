import type { RequestHandler } from 'express';

import log from '../../logger';
import Launch from '../../models/Launch';
import type { ChartRange } from '../../types/launch/market';
import LaunchPriceSample from '../../models/LaunchPriceSample';
import getLaunchScales from '../../utils/launch/getLaunchScales';
import chartLaunchStart from '../../utils/launch/chartLaunchStart';
import parseMarketRequest from '../../utils/launch/parseMarketRequest';
import initialLaunchPrice from '../../utils/launch/initialLaunchPrice';
import toPublicMarketIdentity from '../../utils/launch/toPublicMarketIdentity';

const ranges = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, ALL: 0 };
const intervals = { '1D': 300, '1W': 900, '1M': 3600, '3M': 14_400, ALL: 86_400 };

const getLegacyChart: RequestHandler = async (req, res) => {
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
    const launchStart = chartLaunchStart(launch.config);
    const initialPrice = initialLaunchPrice(launch.config, getLaunchScales(launch).amountScale);
    const historyStart = launchStart ?? firstTime;
    // Keep every response below 1000 buckets, including ALL for old launches.
    const intervalSeconds = Math.max(
      intervals[range as ChartRange],
      days || !historyStart ? 0 : Math.ceil((now.getTime() - historyStart.getTime()) / 998_000),
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

    const observedItems = candles.map((row) => ({
      ...row,
      timestamp: (row.timestamp as Date).toISOString(),
      firstObservedAt: (row.firstObservedAt as Date).toISOString(),
      lastObservedAt: (row.lastObservedAt as Date).toISOString(),
      high: BigInt(row.high).toString(),
      low: BigInt(row.low).toString(),
    }));

    const items = [];
    const step = intervalSeconds * 1000;
    // Preserve the legacy response while filling every interval since opening.
    if (launchStart && launchStart <= now && initialPrice !== null) {
      const rows = new Map(observedItems.map((row) => [row.timestamp, row]));
      let carried = previous?.price ?? initialPrice;
      const beginning = Math.max(since.getTime(), launchStart.getTime());

      for (let time = Math.floor(beginning / step) * step; time <= now.getTime(); time += step) {
        const timestamp = new Date(time).toISOString();
        const row = rows.get(timestamp);
        const open = row?.firstObservedAt === timestamp ? row.open : carried;
        const close = row?.close ?? open;

        items.push({
          timestamp,
          open,
          close,
          high: row && BigInt(row.high) > BigInt(open) ? row.high : open,
          low: row && BigInt(row.low) < BigInt(open) ? row.low : open,
          count: row?.count ?? 0,
          firstObservedAt: row?.firstObservedAt ?? null,
          lastObservedAt: row?.lastObservedAt ?? null,
        });

        carried = close;
      }
    } else if (!launchStart || initialPrice === null) {
      items.push(...observedItems);
    }

    res.set('Cache-Control', 'public, max-age=15');

    return res.json({
      status: 'success',
      message: 'Chart retrieved',
      result: {
        ...toPublicMarketIdentity(identity),
        asset: launch.asset,
        pair: launch.pair,
        range,
        intervalSeconds,
        ...getLaunchScales(launch),
        priceType: 'marginal_before_fee',
        firstObservationAt: firstTime?.toISOString() ?? null,
        lastObservationAt: lastTime?.toISOString() ?? null,
        items,
        previousPrice:
          previous?.price ?? (launchStart && launchStart < since ? initialPrice : null),
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

export default getLegacyChart;
