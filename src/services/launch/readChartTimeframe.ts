import moveCandle from '../../utils/launch/moveCandle';
import candleStart from '../../utils/launch/candleStart';
import LaunchPriceSample from '../../models/LaunchPriceSample';
import { chartTimeframes } from '../../constants/launch/chart';
import buildChartCandles from '../../utils/launch/buildChartCandles';
import type { ChartRequest, ChartTimeframe, ObservedCandle } from '../../types/launch/chart';

const readChartTimeframe = async (
  timeframe: ChartTimeframe,
  request: ChartRequest,
  firstTime: Date | null,
  launchStart: Date | null = null,
) => {
  const { identity, from, to, limit } = request;
  const spec = chartTimeframes[timeframe];
  const starts: Date[] = [];

  const historyStart = launchStart ?? firstTime;

  const beginning =
    historyStart && historyStart < to
      ? new Date(Math.max(historyStart.getTime(), from?.getTime() ?? historyStart.getTime()))
      : null;

  const earliest = beginning ? candleStart(beginning, timeframe) : null;
  let cursor = candleStart(new Date(to.getTime() - 1), timeframe);

  while (earliest && cursor >= earliest && starts.length < limit) {
    starts.unshift(cursor);
    cursor = moveCandle(cursor, timeframe, -1);
  }

  const hasMore = earliest !== null && cursor >= earliest;

  if (!starts.length) {
    return { timeframe, timezone: 'UTC', items: [], hasMore: false, nextBefore: null };
  }

  const start = starts[0]!;

  const [previous, rows] = await Promise.all([
    LaunchPriceSample.findOne({ ...identity, sampledAt: { $lt: start } })
      .sort({ sampledAt: -1, ledger: -1 })
      .lean(),
    LaunchPriceSample.aggregate<ObservedCandle>([
      { $match: { ...identity, sampledAt: { $gte: start, $lt: to } } },
      { $sort: { sampledAt: 1, ledger: 1 } },
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: '$sampledAt',
              ...spec,
              timezone: 'UTC',
              ...(spec.unit === 'week' ? { startOfWeek: 'monday' } : {}),
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
    ]),
  ]);

  return {
    timeframe,
    timezone: 'UTC',
    items: buildChartCandles(
      timeframe,
      starts,
      rows,
      previous?.price ?? null,
      to,
      launchStart ? '10000000' : null,
    ),
    hasMore,
    nextBefore: hasMore ? start.toISOString() : null,
  };
};

export default readChartTimeframe;
