import applicationRules from '../../constants/applicationRules';
import type { PolicyDefinition } from '../../types/policy/model';
import { POLICY_DIMENSIONS, POLICY_MATCHES, POLICY_MAX_AGE_SECONDS } from '../../constants/policy';

const assertPolicyDefinition = (policy: PolicyDefinition): void => {
  if (
    !new RegExp(applicationRules.policies.keyPattern).test(policy.key) ||
    !Number.isInteger(policy.version) ||
    policy.version < applicationRules.policies.minVersion
  ) {
    throw new Error('Invalid policy identity or version');
  }

  if (
    !POLICY_MATCHES.includes(policy.match) ||
    policy.rules.length < applicationRules.policies.minRules ||
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
      rule.minScore < applicationRules.policies.minScore ||
      rule.minScore > applicationRules.policies.maxScore ||
      !Number.isInteger(rule.maxAgeSeconds) ||
      rule.maxAgeSeconds < applicationRules.policies.minAgeSeconds ||
      rule.maxAgeSeconds > POLICY_MAX_AGE_SECONDS
    ) {
      throw new Error('Invalid policy rule');
    }
  }
};

export default assertPolicyDefinition;
