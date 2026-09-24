import { round } from './round.js';
import { normalizeDiminishingReturns } from './normalizeDiminishingReturns.js';
import type {
  DeveloperReputationCalculation,
  DeveloperReputationStatus,
  DeveloperSignalInput,
} from '../../../../types/reputation/scoring.js';

const calculateDeveloperScore = (
  inputs: DeveloperSignalInput[],
  status: DeveloperReputationStatus,
): DeveloperReputationCalculation => {
  if (inputs.some((input) => !Number.isFinite(input.baseWeight) || input.baseWeight <= 0)) {
    throw new Error('Developer signal weights must be positive');
  }

  const totalWeight = inputs.reduce((total, input) => total + input.baseWeight, 0);

  if (totalWeight <= 0) {
    throw new Error('Developer reputation requires at least one weighted signal');
  }

  const signals = inputs.map((input) => {
    const normalizedScore = normalizeDiminishingReturns(input.rawValue, input.scale);
    const weight = round(input.baseWeight / totalWeight, 6);
    const contribution = round(normalizedScore * weight, 4);

    return {
      provider: input.provider,
      key: input.key,
      rawValue: input.rawValue,
      normalization: 'diminishing_returns' as const,
      scale: input.scale,
      baseWeight: input.baseWeight,
      normalizedScore,
      weight,
      contribution,
      observedAt: input.observedAt,
    };
  });
  const score = round(
    signals.reduce((total, signal) => total + signal.contribution, 0),
    2,
  );

  return { status, score, signals };
};

export { calculateDeveloperScore };
