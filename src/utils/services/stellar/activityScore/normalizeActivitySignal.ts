import { round } from './round.js';

const normalizeActivitySignal = (rawValue: number, scale: number): number => {
  if (!Number.isFinite(rawValue) || rawValue < 0 || !Number.isFinite(scale) || scale <= 0) {
    throw new Error('Invalid Stellar activity score signal');
  }

  return round(100 * (1 - Math.exp(-rawValue / scale)), 4);
};

export { normalizeActivitySignal };
