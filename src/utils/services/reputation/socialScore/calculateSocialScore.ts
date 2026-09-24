import { round } from './round.js';
import { normalizeSocialSignal } from './normalizeSocialSignal.js';
import type {
  SocialScoreCalculation,
  SocialSignalInput,
} from '../../../../types/reputation/socialScoring.js';

const calculateSocialScore = (inputs: SocialSignalInput[]): SocialScoreCalculation => {
  if (inputs.some((input) => !Number.isFinite(input.baseWeight) || input.baseWeight <= 0)) {
    throw new Error('Social signal weights must be positive');
  }

  const totalWeight = inputs.reduce((total, input) => total + input.baseWeight, 0);

  if (totalWeight <= 0) {
    throw new Error('Social score requires at least one weighted signal');
  }

  const signals = inputs.map((input) => {
    const normalizedScore = normalizeSocialSignal(input.rawValue, input.scale);
    const weight = round(input.baseWeight / totalWeight, 6);
    const contribution = round(normalizedScore * weight, 4);

    return {
      provider: 'x' as const,
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

  return { score, signals };
};

export { calculateSocialScore };
