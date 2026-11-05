import type { Types } from 'mongoose';

interface ReputationCleanupRecord {
  identity: Types.ObjectId;
  externalAccount: Types.ObjectId;
  provider: 'github' | 'x';
  cutoff: Date;
  status: 'queued' | 'running' | 'completed';
  scheduledAt: Date;
  leaseUntil: Date | null;
  attempts: number;
  lastError: string | null;
}

export type { ReputationCleanupRecord };
