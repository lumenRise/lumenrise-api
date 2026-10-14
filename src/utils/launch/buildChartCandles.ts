import moveCandle from './moveCandle';
import type { ChartTimeframe, ObservedCandle } from '../../types/launch/chart';

const buildChartCandles = (
  timeframe: ChartTimeframe,
  starts: Date[],
  rows: ObservedCandle[],
  previousPrice: string | null,
  asOf: Date,
  fallbackPrice: string | null = null,
) => {
  const observed = new Map(rows.map((row) => [row.timestamp.getTime(), row]));
  let carried = previousPrice ?? fallbackPrice;
  let observedOpening = previousPrice !== null;

  return starts.flatMap((start) => {
    const row = observed.get(start.getTime());
    const end = moveCandle(start, timeframe);

    const open =
      row?.firstObservedAt.getTime() === start.getTime()
        ? row.open
        : (carried ?? row?.open ?? null);

    if (open === null) {
      return [];
    }

    const latestPrice = row?.close ?? open;
    const high = row && BigInt(row.high) > BigInt(open) ? BigInt(row.high).toString() : open;
    const low = row && BigInt(row.low) < BigInt(open) ? BigInt(row.low).toString() : open;
    const complete = end.getTime() <= asOf.getTime();
    const partial = !observedOpening && (!row || row.firstObservedAt.getTime() > start.getTime());

    carried = latestPrice;
    observedOpening ||= row !== undefined;

    return [
      {
        timestamp: start.toISOString(),
        endsAt: end.toISOString(),
        open,
        high,
        low,
        close: complete ? latestPrice : null,
        latestPrice,
        complete,
        partial,
        count: row?.count ?? 0,
        firstObservedAt: row?.firstObservedAt.toISOString() ?? null,
        lastObservedAt: row?.lastObservedAt.toISOString() ?? null,
      },
    ];
  });
};

export default buildChartCandles;
