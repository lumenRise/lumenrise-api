import type { PolicyDimension } from './model.js';

type PolicyDecision = 'eligible' | 'ineligible' | 'insufficient_data';
type PolicyRuleOutcome = 'pass' | 'fail' | 'unknown';
type PolicyRuleReason =
  'threshold_met' | 'below_threshold' | 'score_unavailable' | 'score_incomplete' | 'score_stale';

interface PolicyRuleEvaluation {
  dimension: PolicyDimension;
  minScore: number;
  maxAgeSeconds: number;
  outcome: PolicyRuleOutcome;
  reason: PolicyRuleReason;
  actualScore: number | null;
  algorithmVersion: string | null;
  calculatedAt: string | null;
  sourceIds: string[];
  validUntil: string | null;
}

interface PolicyEvaluation {
  policyKey: string;
  policyVersion: number;
  decision: PolicyDecision;
  evaluatedAt: string;
  expiresAt: string | null;
  rules: PolicyRuleEvaluation[];
}

interface PolicyEvidence {
  state: 'ready' | 'incomplete' | 'missing';
  score: number | null;
  algorithmVersion: string | null;
  calculatedAt: string | null;
  sourceIds: string[];
}

export type {
  PolicyDecision,
  PolicyEvidence,
  PolicyEvaluation,
  PolicyRuleEvaluation,
  PolicyRuleOutcome,
  PolicyRuleReason,
};
