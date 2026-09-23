import { Schema, model } from 'mongoose';

import type { StellarActivityScanRecord } from '../types/stellar/scan.js';
import { createEmptyStellarActivityAggregate } from '../services/stellar/mergeActivityPage.js';

const stellarActivityScanSchema = new Schema<StellarActivityScanRecord>(
  {
    identity: { type: Schema.Types.ObjectId, ref: 'Identity', required: true, immutable: true },
    address: { type: String, required: true, immutable: true },
    sourceUrl: { type: String, required: true, immutable: true },
    status: { type: String, enum: ['queued', 'running', 'completed', 'failed'], required: true },
    active: { type: Boolean, required: true },
    cursor: { type: String, default: null },
    summary: {
      type: Schema.Types.Mixed,
      required: true,
      default: createEmptyStellarActivityAggregate,
    },
    lastDay: { type: String, default: null },
    lastTransactionHash: { type: String, default: null },
    pagesProcessed: { type: Number, default: 0, min: 0, required: true },
    consecutiveFailures: { type: Number, default: 0, min: 0, required: true },
    scheduledAt: { type: Date, default: Date.now, required: true },
    leaseUntil: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    lastProcessedAt: { type: Date, default: null },
    lastError: { type: String, default: null, maxlength: 2_000 },
  },
  { timestamps: true, versionKey: false },
);

stellarActivityScanSchema.pre('validate', function validateScanState() {
  if (this.active !== (this.status === 'queued' || this.status === 'running')) {
    this.invalidate('active', 'Active must match the scan status');
  }

  if (this.status === 'running' && !this.leaseUntil) {
    this.invalidate('leaseUntil', 'Running scans require a lease');
  }

  if ((this.status === 'completed' || this.status === 'failed') && !this.completedAt) {
    this.invalidate('completedAt', 'Terminal scans require a completion timestamp');
  }
});

stellarActivityScanSchema.index(
  { identity: 1, active: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true },
    name: 'stellar_activity_one_active_per_identity',
  },
);
stellarActivityScanSchema.index(
  { status: 1, scheduledAt: 1, leaseUntil: 1 },
  { name: 'stellar_activity_scan_claim' },
);
stellarActivityScanSchema.index(
  { identity: 1, address: 1, createdAt: -1 },
  { name: 'stellar_activity_scan_identity_address' },
);

const StellarActivityScan = model<StellarActivityScanRecord>(
  'StellarActivityScan',
  stellarActivityScanSchema,
);

export default StellarActivityScan;
