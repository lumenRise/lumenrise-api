import type { PolicyMatch } from '../../types/policy/model.js';
import type { PolicyDecision, PolicyRuleEvaluation } from '../../types/policy/evaluation.js';

const resolvePolicyDecision = (
  match: PolicyMatch,
  rules: PolicyRuleEvaluation[],
): PolicyDecision => {
  if (match === 'all') {
    if (rules.some((rule) => rule.outcome === 'fail')) {
      return 'ineligible';
    }

    return rules.every((rule) => rule.outcome === 'pass') ? 'eligible' : 'insufficient_data';
  }

  if (rules.some((rule) => rule.outcome === 'pass')) {
    return 'eligible';
  }

  return rules.every((rule) => rule.outcome === 'fail') ? 'ineligible' : 'insufficient_data';
};

export default resolvePolicyDecision;
