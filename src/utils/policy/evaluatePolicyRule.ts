import getPolicyEvidence from './getPolicyEvidence.js';
import type { PolicyRule } from '../../types/policy/model.js';
import type { PolicyRuleEvaluation } from '../../types/policy/evaluation.js';
import type { ReputationProfileResult } from '../../types/reputation/profile.js';

const evaluatePolicyRule = (
  rule: PolicyRule,
  profile: ReputationProfileResult,
  evaluatedAt: Date,
): PolicyRuleEvaluation => {
  const evidence = getPolicyEvidence(rule.dimension, profile);

  const base = {
    dimension: rule.dimension,
    minScore: rule.minScore,
    maxAgeSeconds: rule.maxAgeSeconds,
    actualScore: evidence.score,
    algorithmVersion: evidence.algorithmVersion,
    calculatedAt: evidence.calculatedAt,
    sourceIds: evidence.sourceIds,
  };

  if (evidence.state !== 'ready' || evidence.score === null || !evidence.calculatedAt) {
    return {
      ...base,
      outcome: 'unknown',
      reason: evidence.state === 'missing' ? 'score_unavailable' : 'score_incomplete',
      validUntil: null,
    };
  }

  const calculatedAtMs = Date.parse(evidence.calculatedAt);
  const validUntilMs = calculatedAtMs + rule.maxAgeSeconds * 1_000;

  if (
    !Number.isFinite(validUntilMs) ||
    calculatedAtMs > evaluatedAt.getTime() ||
    validUntilMs <= evaluatedAt.getTime()
  ) {
    return { ...base, outcome: 'unknown', reason: 'score_stale', validUntil: null };
  }

  return {
    ...base,
    outcome: evidence.score >= rule.minScore ? 'pass' : 'fail',
    reason: evidence.score >= rule.minScore ? 'threshold_met' : 'below_threshold',
    validUntil: new Date(validUntilMs).toISOString(),
  };
};

export default evaluatePolicyRule;
