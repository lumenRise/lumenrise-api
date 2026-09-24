import assertPolicyDefinition from './assertPolicyDefinition.js';
import type { PolicyDefinition } from '../../types/policy/model.js';

const parsePolicyDefinition = (input: unknown): PolicyDefinition | null => {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return null;
  }

  const value = input as Record<string, unknown>;

  if (
    typeof value.key !== 'string' ||
    typeof value.version !== 'number' ||
    typeof value.match !== 'string' ||
    !Array.isArray(value.rules) ||
    value.rules.some(
      (rule: unknown) =>
        typeof rule !== 'object' ||
        rule === null ||
        Array.isArray(rule) ||
        typeof Reflect.get(rule, 'dimension') !== 'string' ||
        typeof Reflect.get(rule, 'minScore') !== 'number' ||
        typeof Reflect.get(rule, 'maxAgeSeconds') !== 'number',
    )
  ) {
    return null;
  }

  const policy = value as unknown as PolicyDefinition;

  try {
    assertPolicyDefinition(policy);
  } catch {
    return null;
  }

  return {
    key: policy.key,
    version: policy.version,
    match: policy.match,
    rules: policy.rules.map((rule) => ({
      dimension: rule.dimension,
      minScore: rule.minScore,
      maxAgeSeconds: rule.maxAgeSeconds,
    })),
  };
};

export default parsePolicyDefinition;
