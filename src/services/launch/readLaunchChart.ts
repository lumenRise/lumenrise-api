import Launch from '../../models/Launch';
import readChartTimeframe from './readChartTimeframe';
import type { ChartRequest } from '../../types/launch/chart';
import LaunchPriceSample from '../../models/LaunchPriceSample';

const readLaunchChart = async (request: ChartRequest) => {
  const { identity, timeframes, to } = request;
  const launch = await Launch.findOne(identity).lean();

  if (!launch) {
    return null;
  }

  const [first, last] = await Promise.all([
    LaunchPriceSample.findOne({ ...identity, sampledAt: { $lt: to } })
      .sort({ sampledAt: 1, ledger: 1 })
      .lean(),
    LaunchPriceSample.findOne({ ...identity, sampledAt: { $lt: to } })
      .sort({ sampledAt: -1, ledger: -1 })
      .lean(),
  ]);

  const charts = await Promise.all(
    timeframes.map((timeframe) => readChartTimeframe(timeframe, request, first?.sampledAt ?? null)),
  );

  return {
    ...identity,
    asset: launch.asset,
    pair: launch.pair,
    amountScale: 7,
    priceScale: 7,
    priceType: 'marginal_before_fee',
    asOf: to.toISOString(),
    firstObservationAt: first?.sampledAt.toISOString() ?? null,
    lastObservationAt: last?.sampledAt.toISOString() ?? null,
    timeframes: charts,
  };
};

export default readLaunchChart;
