import { Schema, model } from 'mongoose';

import type { XDataSnapshotRecord } from '../types/reputation/x.js';

const coverageSchema = new Schema(
  {
    profile: { type: Boolean, required: true },
    posts: { type: Boolean, required: true },
  },
  { _id: false, versionKey: false },
);

const metricsSchema = new Schema(
  {
    accountAgeDays: { type: Number, required: true },
    followerCount: { type: Number, required: true },
    followingCount: { type: Number, required: true },
    reportedPostCount: { type: Number, required: true },
    listedCount: { type: Number, required: true },
    profileLikeCount: { type: Number, required: true },
    mediaCount: { type: Number, required: true },
    collectedPostCount: { type: Number, required: true },
    originalPostCount: { type: Number, required: true },
    replyPostCount: { type: Number, required: true },
    repostCount: { type: Number, required: true },
    quotePostCount: { type: Number, required: true },
    activeDayCount: { type: Number, required: true },
    receivedRepostCount: { type: Number, required: true },
    receivedReplyCount: { type: Number, required: true },
    receivedLikeCount: { type: Number, required: true },
    receivedQuoteCount: { type: Number, required: true },
    receivedBookmarkCount: { type: Number, required: true },
    impressionCount: { type: Number, required: true },
  },
  { _id: false, versionKey: false },
);

const xDataSnapshotSchema = new Schema<XDataSnapshotRecord>(
  {
    identity: { type: Schema.Types.ObjectId, ref: 'Identity', required: true, immutable: true },
    externalAccount: {
      type: Schema.Types.ObjectId,
      ref: 'ExternalAccount',
      required: true,
      immutable: true,
    },
    providerAccountId: { type: String, required: true, immutable: true },
    username: { type: String, required: true },
    status: { type: String, enum: ['complete', 'partial'], required: true, immutable: true },
    dataVersion: { type: String, required: true, immutable: true },
    coverage: { type: coverageSchema, required: true, immutable: true },
    metrics: { type: metricsSchema, required: true, immutable: true },
    activityFrom: { type: Date, default: null, immutable: true },
    activityTo: { type: Date, required: true, immutable: true },
    collectedAt: { type: Date, required: true, immutable: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

xDataSnapshotSchema.index(
  { identity: 1, collectedAt: -1 },
  { name: 'x_data_snapshots_identity_collected' },
);

xDataSnapshotSchema.index(
  { externalAccount: 1, collectedAt: -1 },
  { name: 'x_data_snapshots_account_collected' },
);

const XDataSnapshot = model<XDataSnapshotRecord>('XDataSnapshot', xDataSnapshotSchema);

export default XDataSnapshot;
