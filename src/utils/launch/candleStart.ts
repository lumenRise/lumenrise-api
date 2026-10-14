import type { ChartTimeframe } from '../../types/launch/chart';
import { chartTimeframes } from '../../constants/launch/chart';

const candleStart = (time: Date, timeframe: ChartTimeframe): Date => {
  const { unit, binSize } = chartTimeframes[timeframe];

  if (unit === 'month' || unit === 'year') {
    const months = unit === 'year' ? 12 : binSize;
    const month = time.getUTCFullYear() * 12 + time.getUTCMonth();
    const aligned = Math.floor(month / months) * months;

    return new Date(Date.UTC(Math.floor(aligned / 12), aligned % 12, 1));
  }

  const duration =
    { minute: 60_000, hour: 3_600_000, day: 86_400_000, week: 604_800_000 }[unit] * binSize;

  const origin = unit === 'week' ? Date.UTC(2000, 0, 3) : 0;

  return new Date(origin + Math.floor((time.getTime() - origin) / duration) * duration);
};

export default candleStart;
