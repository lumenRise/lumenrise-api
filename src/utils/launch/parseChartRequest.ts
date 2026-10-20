import type { Request } from 'express';

import parseChartDate from './parseChartDate';
import parseMarketRequest from './parseMarketRequest';
import applicationRules from '../../constants/applicationRules';
import type { ChartRequest, ChartTimeframe } from '../../types/launch/chart';
import { chartTimeframes, defaultTimeframes } from '../../constants/launch/chart';

const parseChartRequest = (req: Request, now = new Date()): ChartRequest | null => {
  const identity = parseMarketRequest(req);
  const raw = req.query.timeframes;

  const requested =
    raw === undefined
      ? [...defaultTimeframes]
      : typeof raw === 'string'
        ? raw.split(',')
        : Array.isArray(raw)
          ? raw
          : [];

  const limit =
    req.query.limit === undefined
      ? applicationRules.chart.defaultLimit
      : typeof req.query.limit === 'string'
        ? Number(req.query.limit)
        : NaN;

  const from = req.query.from === undefined ? undefined : parseChartDate(req.query.from);
  const to = req.query.to === undefined ? now : parseChartDate(req.query.to);

  if (
    !identity ||
    !requested.length ||
    requested.length > applicationRules.chart.maxTimeframes ||
    !requested.every(
      (frame) => typeof frame === 'string' && Object.hasOwn(chartTimeframes, frame),
    ) ||
    !Number.isInteger(limit) ||
    limit < applicationRules.chart.minLimit ||
    limit > applicationRules.chart.maxLimit ||
    from === null ||
    !to ||
    to > now ||
    (from && from >= to) ||
    (req.query.kind !== undefined && req.query.kind !== 'sampled')
  ) {
    return null;
  }

  return { identity, timeframes: [...new Set(requested)] as ChartTimeframe[], from, to, limit };
};

export default parseChartRequest;
