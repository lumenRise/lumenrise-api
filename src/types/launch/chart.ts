import type { MarketIdentity } from './market';
import type { chartTimeframes } from '../../constants/launch/chart';

type ChartTimeframe = keyof typeof chartTimeframes;

interface ChartRequest {
  identity: MarketIdentity;
  timeframes: ChartTimeframe[];
  from?: Date;
  to: Date;
  limit: number;
}

interface ObservedCandle {
  timestamp: Date;
  open: string;
  close: string;
  high: string;
  low: string;
  count: number;
  firstObservedAt: Date;
  lastObservedAt: Date;
}

export type { ChartTimeframe, ChartRequest, ObservedCandle };
