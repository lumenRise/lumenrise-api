import type { PolicyDefinition } from '../../types/policy/model.js';
import type { PolicyEvaluation } from '../../types/policy/evaluation.js';
import evaluatePolicyRule from '../../utils/policy/evaluatePolicyRule.js';
import resolvePolicyDecision from '../../utils/policy/resolvePolicyDecision.js';
import type { ReputationProfileResult } from '../../types/reputation/profile.js';
import assertPolicyDefinition from '../../utils/policy/assertPolicyDefinition.js';

const evaluatePolicy = (
  policy: PolicyDefinition,
  profile: ReputationProfileResult,
  evaluatedAt: Date = new Date(),
): PolicyEvaluation => {
  assertPolicyDefinition(policy);

  if (!Number.isFinite(evaluatedAt.getTime())) {
    throw new Error('Invalid evaluation time');
  }

  const rules = policy.rules.map((rule) => evaluatePolicyRule(rule, profile, evaluatedAt));
  const decision = resolvePolicyDecision(policy.match, rules);

  const passingExpiryTimes = rules
    .filter((rule) => rule.outcome === 'pass' && rule.validUntil)
    .map((rule) => Date.parse(rule.validUntil!));

  const expiresAt =
    decision === 'eligible'
      ? new Date(
          policy.match === 'all'
            ? Math.min(...passingExpiryTimes)
            : Math.max(...passingExpiryTimes),
        ).toISOString()
      : null;

  return {
    policyKey: policy.key,
    policyVersion: policy.version,
    decision,
    evaluatedAt: evaluatedAt.toISOString(),
    expiresAt,
    rules,
  };
};

export default evaluatePolicy;
