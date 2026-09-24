import type { HydratedDocument, Types } from 'mongoose';

type PolicyDimension = 'developer' | 'social' | 'stellar';
type PolicyMatch = 'all' | 'any';

interface PolicyRule {
  dimension: PolicyDimension;
  minScore: number;
  maxAgeSeconds: number;
}

interface PolicyDefinition {
  key: string;
  version: number;
  match: PolicyMatch;
  rules: PolicyRule[];
}

interface PolicyRecord extends PolicyDefinition {
  ownerIdentity: Types.ObjectId;
  createdAt: Date;
}

type PolicyDocument = HydratedDocument<PolicyRecord>;

export type {
  PolicyDefinition,
  PolicyDimension,
  PolicyDocument,
  PolicyMatch,
  PolicyRecord,
  PolicyRule,
};
