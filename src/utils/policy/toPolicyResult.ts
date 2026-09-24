import type { PolicyResult } from '../../types/policy/api.js';
import type { PolicyDocument } from '../../types/policy/model.js';

const toPolicyResult = (policy: PolicyDocument): PolicyResult => ({
  id: policy._id.toString(),
  key: policy.key,
  version: policy.version,
  match: policy.match,
  rules: policy.rules.map((rule) => ({
    dimension: rule.dimension,
    minScore: rule.minScore,
    maxAgeSeconds: rule.maxAgeSeconds,
  })),
  createdAt: policy.createdAt.toISOString(),
});

export default toPolicyResult;
