import { round } from './round.js';

const normalizeDiminishingReturns = (rawValue: number, scale: number): number => {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error('Developer signal scale must be positive');
  }

  if (!Number.isFinite(rawValue)) {
    throw new Error('Developer signal value must be finite');
  }

  const value = Math.max(0, rawValue);

  return round(100 * (1 - Math.exp(-value / scale)), 4);
};

export { normalizeDiminishingReturns };
