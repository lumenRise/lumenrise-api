import type { PolicyDefinition } from '../../types/policy/model.js';
import {
  POLICY_DIMENSIONS,
  POLICY_MATCHES,
  POLICY_MAX_AGE_SECONDS,
} from '../../constants/policy.js';

const assertPolicyDefinition = (policy: PolicyDefinition): void => {
  if (
    !/^[a-z][a-z0-9-]{2,63}$/.test(policy.key) ||
    !Number.isInteger(policy.version) ||
    policy.version < 1
  ) {
    throw new Error('Invalid policy identity or version');
  }

  if (
    !POLICY_MATCHES.includes(policy.match) ||
    policy.rules.length < 1 ||
    policy.rules.length > POLICY_DIMENSIONS.length
  ) {
    throw new Error('Invalid policy rule group');
  }

  if (new Set(policy.rules.map((rule) => rule.dimension)).size !== policy.rules.length) {
    throw new Error('Policy dimensions must be unique');
  }

  for (const rule of policy.rules) {
    if (
      !POLICY_DIMENSIONS.includes(rule.dimension) ||
      !Number.isFinite(rule.minScore) ||
      rule.minScore < 0 ||
      rule.minScore > 100 ||
      !Number.isInteger(rule.maxAgeSeconds) ||
      rule.maxAgeSeconds < 60 ||
      rule.maxAgeSeconds > POLICY_MAX_AGE_SECONDS
    ) {
      throw new Error('Invalid policy rule');
    }
  }
};

export default assertPolicyDefinition;
