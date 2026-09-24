import { round } from './round.js';

const normalizeSocialSignal = (rawValue: number, scale: number): number => {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error('Social signal scale must be positive');
  }

  if (!Number.isFinite(rawValue) || rawValue < 0) {
    throw new Error('Social signal value must be finite and nonnegative');
  }

  return round(100 * (1 - Math.exp(-rawValue / scale)), 4);
};

export { normalizeSocialSignal };
