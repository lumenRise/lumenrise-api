import { Schema, model } from 'mongoose';

import type { GitLabDataSnapshotRecord } from '../types/reputation/gitlab.js';

const coverageSchema = new Schema(
  {
    profile: { type: Boolean, required: true },
    projects: { type: Boolean, required: true },
    contributions: { type: Boolean, required: true },
    associations: { type: Boolean, required: true },
  },
  { _id: false, versionKey: false },
);
const metricsSchema = new Schema(
  {
    accountAgeDays: { type: Number, required: true },
    followerCount: { type: Number, required: true },
    followingCount: { type: Number, required: true },
    reportedProjectCount: { type: Number, required: true },
    reportedGroupCount: { type: Number, required: true },
    reportedIssueCount: { type: Number, required: true },
    reportedMergeRequestCount: { type: Number, required: true },
    collectedProjectCount: { type: Number, required: true },
    ownedProjectCount: { type: Number, required: true },
    contributedProjectCount: { type: Number, required: true },
    archivedProjectCount: { type: Number, required: true },
    forkProjectCount: { type: Number, required: true },
    projectStars: { type: Number, required: true },
    projectForks: { type: Number, required: true },
    projectOpenIssues: { type: Number, required: true },
    collectedEventCount: { type: Number, required: true },
    pushEventCount: { type: Number, required: true },
    pushedCommitCount: { type: Number, required: true },
    issueEventCount: { type: Number, required: true },
    mergeRequestEventCount: { type: Number, required: true },
    noteEventCount: { type: Number, required: true },
  },
  { _id: false, versionKey: false },
);
const gitlabDataSnapshotSchema = new Schema<GitLabDataSnapshotRecord>(
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

gitlabDataSnapshotSchema.index(
  { identity: 1, collectedAt: -1 },
  { name: 'gitlab_data_snapshots_identity_collected' },
);

const GitLabDataSnapshot = model<GitLabDataSnapshotRecord>(
  'GitLabDataSnapshot',
  gitlabDataSnapshotSchema,
);

export default GitLabDataSnapshot;
