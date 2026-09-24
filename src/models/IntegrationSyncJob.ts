import { Schema, model } from 'mongoose';

import { INTEGRATION_SYNC_JOB_STATUSES } from '../constants/integration.js';
import type { IntegrationSyncJobRecord } from '../types/integration/sync.js';

const integrationSyncJobSchema = new Schema<IntegrationSyncJobRecord>(
  {
    identity: { type: Schema.Types.ObjectId, ref: 'Identity', required: true, immutable: true },
    externalAccount: {
      type: Schema.Types.ObjectId,
      ref: 'ExternalAccount',
      required: true,
      immutable: true,
    },
    provider: { type: String, enum: ['github', 'gitlab', 'x'], required: true, immutable: true },
    status: {
      type: String,
      enum: INTEGRATION_SYNC_JOB_STATUSES,
      default: 'queued',
      required: true,
    },
    active: { type: Boolean, default: true, required: true },
    attempts: { type: Number, default: 0, min: 0, required: true },
    maxAttempts: { type: Number, default: 5, min: 1, required: true, immutable: true },
    scheduledAt: { type: Date, default: Date.now, required: true },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    leaseUntil: { type: Date, default: null },
    lastError: { type: String, default: null, maxlength: 2_000 },
    resultSnapshot: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: true, versionKey: false },
);

integrationSyncJobSchema.pre('validate', function validateJobState() {
  const isActiveStatus = this.status === 'queued' || this.status === 'running';
  const isTerminalStatus =
    this.status === 'completed' || this.status === 'failed' || this.status === 'cancelled';

  if (this.active !== isActiveStatus) {
    this.invalidate('active', 'Active must match the sync job status');
  }

  if (this.status === 'running' && !this.startedAt) {
    this.invalidate('startedAt', 'Running sync jobs require a start timestamp');
  }

  if (isTerminalStatus && !this.completedAt) {
    this.invalidate('completedAt', 'Terminal sync jobs require a completion timestamp');
  }
});

integrationSyncJobSchema.index(
  { externalAccount: 1, active: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true },
    name: 'integration_sync_jobs_one_active_per_account',
  },
);

integrationSyncJobSchema.index(
  { status: 1, scheduledAt: 1, leaseUntil: 1 },
  { name: 'integration_sync_jobs_claim' },
);

integrationSyncJobSchema.index(
  { identity: 1, createdAt: -1 },
  { name: 'integration_sync_jobs_identity_created' },
);

const IntegrationSyncJob = model<IntegrationSyncJobRecord>(
  'IntegrationSyncJob',
  integrationSyncJobSchema,
);

export default IntegrationSyncJob;
