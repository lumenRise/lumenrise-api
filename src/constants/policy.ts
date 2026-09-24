import type { PolicyDimension, PolicyMatch } from '../types/policy/model.js';

const POLICY_DIMENSIONS = [
  'developer',
  'social',
  'stellar',
] as const satisfies readonly PolicyDimension[];

const POLICY_MATCHES = ['all', 'any'] as const satisfies readonly PolicyMatch[];

const POLICY_MAX_AGE_SECONDS = 31_536_000;

export { POLICY_DIMENSIONS, POLICY_MATCHES, POLICY_MAX_AGE_SECONDS };
