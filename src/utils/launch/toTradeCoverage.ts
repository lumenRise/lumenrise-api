import type { TradeCoverage, TradeCursorRecord } from '../../types/launch/market';

const toTradeCoverage = (cursor: TradeCursorRecord | null, now = new Date()): TradeCoverage => ({
  source: 'successful_direct_curve_calls',
  historyComplete: false,
  coverageFrom: cursor?.coverageFrom.toISOString() ?? null,
  scannedThroughLedger: cursor?.scannedThroughLedger ?? null,
  scannedAt: cursor?.scannedAt.toISOString() ?? null,
  stale: !cursor || now.getTime() - cursor.scannedAt.getTime() > 120_000,
  caughtUp: !!cursor && cursor.scannedThroughLedger >= cursor.nextLedger,
  historyGap: cursor?.historyGap ?? false,
  unclassifiedCount: cursor?.unclassifiedCount ?? 0,
});

export default toTradeCoverage;
