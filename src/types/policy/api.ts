import type { PolicyDefinition } from './model';

interface PolicyResult extends PolicyDefinition {
  id: string;
  createdAt: string;
}

interface PolicyListResult {
  policies: PolicyResult[];
}

export type { PolicyListResult, PolicyResult };
