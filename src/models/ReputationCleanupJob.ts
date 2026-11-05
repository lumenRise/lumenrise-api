import { Schema, model } from 'mongoose';

import type { ReputationCleanupRecord } from '../types/reputation/cleanup';

const schema = new Schema<ReputationCleanupRecord>(
  {
    identity: { type: Schema.Types.ObjectId, required: true, immutable: true },
    externalAccount: { type: Schema.Types.ObjectId, required: true, immutable: true },
    provider: { type: String, enum: ['github', 'x'], required: true, immutable: true },
    cutoff: { type: Date, required: true, immutable: true },
    status: { type: String, enum: ['queued', 'running', 'completed'], default: 'queued' },
    scheduledAt: { type: Date, default: Date.now },
    leaseUntil: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
  },
  { collection: 'reputation_cleanup_jobs', versionKey: false },
);

schema.index(
  { externalAccount: 1, cutoff: -1 },
  { unique: true, name: 'reputation_cleanup_account_cutoff' },
);

schema.index({ status: 1, scheduledAt: 1, leaseUntil: 1 }, { name: 'reputation_cleanup_due' });

const ReputationCleanupJob = model<ReputationCleanupRecord>('ReputationCleanupJob', schema);

export default ReputationCleanupJob;
