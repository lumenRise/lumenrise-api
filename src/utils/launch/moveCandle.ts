import type { ChartTimeframe } from '../../types/launch/chart';
import { chartTimeframes } from '../../constants/launch/chart';

const moveCandle = (start: Date, timeframe: ChartTimeframe, steps = 1): Date => {
  const { unit, binSize } = chartTimeframes[timeframe];

  if (unit === 'month' || unit === 'year') {
    return new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth() + steps * (unit === 'year' ? 12 : binSize),
        1,
      ),
    );
  }

  return new Date(
    start.getTime() +
      steps *
        binSize *
        { minute: 60_000, hour: 3_600_000, day: 86_400_000, week: 604_800_000 }[unit],
  );
};

export default moveCandle;
