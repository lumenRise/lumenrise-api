import type { HydratedDocument, Types } from 'mongoose';

interface DeveloperApiKeyRecord {
  identity: Types.ObjectId;
  label: string;
  tokenHash: string;
  prefix: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

interface DeveloperApiUsageRecord {
  identity: Types.ObjectId;
  windowStart: Date;
  count: number;
  expiresAt: Date;
}

interface DeveloperApiKeyResult {
  id: string;
  label: string;
  prefix: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

interface DeveloperApiKeyCreatedResult extends DeveloperApiKeyResult {
  apiKey: string;
}

interface DeveloperApiKeyListResult {
  keys: DeveloperApiKeyResult[];
}

type DeveloperApiKeyDocument = HydratedDocument<DeveloperApiKeyRecord>;

export type {
  DeveloperApiKeyDocument,
  DeveloperApiKeyRecord,
  DeveloperApiKeyResult,
  DeveloperApiKeyCreatedResult,
  DeveloperApiKeyListResult,
  DeveloperApiUsageRecord,
};
