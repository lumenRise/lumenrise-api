import { Schema, model } from 'mongoose';

import { EXTERNAL_ACCOUNT_PROVIDERS } from '../constants/integration.js';
import { REPUTATION_CATEGORIES, REPUTATION_SNAPSHOT_STATUSES } from '../constants/reputation.js';
import type {
  ReputationSignalRecord,
  ReputationSourceRecord,
  ReputationSnapshotRecord,
} from '../types/reputation/model.js';

const reputationSignalSchema = new Schema<ReputationSignalRecord>(
  {
    provider: {
      type: String,
      enum: EXTERNAL_ACCOUNT_PROVIDERS,
      required: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    rawValue: {
      type: Number,
      required: true,
    },
    normalizedScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    contribution: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    observedAt: {
      type: Date,
      required: true,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);
const reputationSourceSchema = new Schema<ReputationSourceRecord>(
  {
    provider: {
      type: String,
      enum: EXTERNAL_ACCOUNT_PROVIDERS,
      required: true,
    },
    snapshot: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    dataVersion: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    collectedAt: {
      type: Date,
      required: true,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);
const reputationSnapshotSchema = new Schema<ReputationSnapshotRecord>(
  {
    identity: {
      type: Schema.Types.ObjectId,
      ref: 'Identity',
      required: true,
      immutable: true,
    },
    category: {
      type: String,
      enum: REPUTATION_CATEGORIES,
      required: true,
      immutable: true,
    },
    status: {
      type: String,
      enum: REPUTATION_SNAPSHOT_STATUSES,
      required: true,
      immutable: true,
    },
    algorithmVersion: {
      type: String,
      required: true,
      trim: true,
      immutable: true,
      match: [/^[a-z0-9][a-z0-9._-]{0,63}$/, 'Invalid algorithm version'],
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
      immutable: true,
    },
    signals: {
      type: [reputationSignalSchema],
      default: [],
      immutable: true,
    },
    sources: {
      type: [reputationSourceSchema],
      default: [],
      immutable: true,
    },
    calculatedAt: {
      type: Date,
      required: true,
      immutable: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

reputationSnapshotSchema.pre('validate', function validateScoreStatus() {
  if (this.status === 'complete' && this.score === null) {
    this.invalidate('score', 'Complete reputation snapshots require a score');
  }

  if (this.status === 'failed' && this.score !== null) {
    this.invalidate('score', 'Failed reputation snapshots cannot contain a score');
  }
});

reputationSnapshotSchema.index(
  { identity: 1, category: 1, calculatedAt: -1 },
  { name: 'reputation_snapshots_identity_category_calculated' },
);
reputationSnapshotSchema.index(
  { algorithmVersion: 1, category: 1 },
  { name: 'reputation_snapshots_algorithm_category' },
);

const ReputationSnapshot = model<ReputationSnapshotRecord>(
  'ReputationSnapshot',
  reputationSnapshotSchema,
);

export default ReputationSnapshot;
