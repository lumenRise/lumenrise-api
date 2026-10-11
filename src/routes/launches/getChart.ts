import type { RequestHandler } from 'express';

import log from '../../logger';
import Launch from '../../models/Launch';
import LaunchTrade from '../../models/LaunchTrade';
import LaunchPriceSample from '../../models/LaunchPriceSample';
import LaunchTradeCursor from '../../models/LaunchTradeCursor';
import decimalInteger from '../../utils/launch/decimalInteger';
import toTradeCoverage from '../../utils/launch/toTradeCoverage';
import parseMarketRequest from '../../utils/launch/parseMarketRequest';
import type { ChartRange, TradePosition, PriceSampleRecord } from '../../types/launch/market';

const ranges = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, ALL: 0 };
const intervals = { '1D': 300, '1W': 900, '1M': 3600, '3M': 14_400, ALL: 86_400 };

const getChart: RequestHandler = async (req, res) => {
  const identity = parseMarketRequest(req);
  const range = req.query.range ?? '1D';
  const kind = req.query.kind ?? 'sampled';

  if (
    !identity ||
    typeof range !== 'string' ||
    !Object.hasOwn(ranges, range) ||
    (kind !== 'sampled' && kind !== 'execution')
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
    const execution = kind === 'execution';
    const timeField = execution ? 'tradedAt' : 'sampledAt';
    const priceField = execution ? 'executionPrice' : 'price';
    const model = execution ? LaunchTrade : LaunchPriceSample;

    const [first, last, cursor] = await Promise.all([
      execution
        ? LaunchTrade.findOne(identity).sort({ tradedAt: 1 }).lean()
        : LaunchPriceSample.findOne(identity).sort({ sampledAt: 1 }).lean(),
      execution
        ? LaunchTrade.findOne(identity).sort({ tradedAt: -1 }).lean()
        : LaunchPriceSample.findOne(identity).sort({ sampledAt: -1 }).lean(),
      LaunchTradeCursor.findOne(identity).lean(),
    ]);

    const firstTime = first
      ? execution
        ? (first as TradePosition).tradedAt
        : (first as PriceSampleRecord).sampledAt
      : null;

    const lastTime = last
      ? execution
        ? (last as TradePosition).tradedAt
        : (last as PriceSampleRecord).sampledAt
      : null;

    // Keep every response below 1000 buckets, including ALL for old launches.
    const intervalSeconds = Math.max(
      intervals[range as ChartRange],
      days || !firstTime ? 0 : Math.ceil((now.getTime() - firstTime.getTime()) / 998_000),
    );

    const candles = await model.aggregate([
      { $match: { ...identity, [timeField]: { $gte: since, $lte: now } } },
      {
        $sort: {
          [timeField]: 1,
          ledger: 1,
          ...(execution ? { transactionIndex: 1, operationIndex: 1 } : {}),
        },
      },
      {
        $group: {
          _id: {
            $toDate: {
              $subtract: [
                { $toLong: `$${timeField}` },
                { $mod: [{ $toLong: `$${timeField}` }, intervalSeconds * 1000] },
              ],
            },
          },
          open: { $first: `$${priceField}` },
          close: { $last: `$${priceField}` },
          high: { $max: '$priceSort' },
          low: { $min: '$priceSort' },
          count: { $sum: 1 },
          firstObservedAt: { $first: `$${timeField}` },
          lastObservedAt: { $last: `$${timeField}` },
          ...(execution ? { grossVolume: { $sum: { $toDecimal: '$grossAmount' } } } : {}),
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
          ...(execution ? { grossVolume: { $toString: '$grossVolume' } } : {}),
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
      grossVolume: execution ? decimalInteger(row.grossVolume) : null,
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
        kind,
        intervalSeconds,
        priceScale: 7,
        amountScale: 7,
        priceType: execution ? 'execution_before_fee' : 'observed_marginal_before_fee',
        firstObservationAt: firstTime?.toISOString() ?? null,
        lastObservationAt: lastTime?.toISOString() ?? null,
        items,
        emptyBuckets: 'omitted',
        historyComplete: false,
        ...(execution
          ? { coverage: toTradeCoverage(cursor, now) }
          : {
              coverage: {
                source: 'indexed_state_samples',
                coverageFrom: firstTime?.toISOString() ?? null,
                stale: !lastTime || now.getTime() - lastTime.getTime() > 60_000,
                note: 'Minute samples of observed state; intraminute extremes and pre-indexing prices are not reconstructed.',
              },
            }),
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
