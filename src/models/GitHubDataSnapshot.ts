import { Schema, model } from 'mongoose';

import type { GitHubDataSnapshotRecord } from '../types/reputation/github.js';

const contributionPeriodSchema = new Schema(
  {
    key: { type: String, required: true },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    totalContributions: { type: Number, required: true },
    commitContributions: { type: Number, required: true },
    issueContributions: { type: Number, required: true },
    pullRequestContributions: { type: Number, required: true },
    pullRequestReviewContributions: { type: Number, required: true },
    repositoryContributions: { type: Number, required: true },
    restrictedContributions: { type: Number, required: true },
    repositoriesWithCommitContributions: { type: Number, required: true },
    repositoriesWithIssueContributions: { type: Number, required: true },
    repositoriesWithPullRequestContributions: { type: Number, required: true },
    repositoriesWithPullRequestReviewContributions: { type: Number, required: true },
  },
  { _id: false, versionKey: false },
);
const metricsSchema = new Schema(
  {
    accountAgeDays: { type: Number, required: true },
    followerCount: { type: Number, required: true },
    followingCount: { type: Number, required: true },
    publicGistCount: { type: Number, required: true },
    reportedPublicRepositoryCount: { type: Number, required: true },
    collectedRepositoryCount: { type: Number, required: true },
    originalRepositoryCount: { type: Number, required: true },
    forkRepositoryCount: { type: Number, required: true },
    archivedRepositoryCount: { type: Number, required: true },
    originalRepositoryStars: { type: Number, required: true },
    originalRepositoryForks: { type: Number, required: true },
    originalRepositoryWatchers: { type: Number, required: true },
    originalRepositoryOpenIssues: { type: Number, required: true },
    originalRepositoryMergedPullRequests: { type: Number, required: true },
    originalRepositoryReleases: { type: Number, required: true },
    allTimeContributions: { type: Number, required: true },
    allTimeCommits: { type: Number, required: true },
    allTimeIssues: { type: Number, required: true },
    allTimePullRequests: { type: Number, required: true },
    allTimePullRequestReviews: { type: Number, required: true },
    allTimeRepositoriesCreated: { type: Number, required: true },
    allTimeRestrictedContributions: { type: Number, required: true },
    activeYearCount: { type: Number, required: true },
  },
  { _id: false, versionKey: false },
);
const coverageSchema = new Schema(
  {
    profile: { type: Boolean, required: true },
    contributions: { type: Boolean, required: true },
    repositories: { type: Boolean, required: true },
  },
  { _id: false, versionKey: false },
);
const githubDataSnapshotSchema = new Schema<GitHubDataSnapshotRecord>(
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
    contributionPeriods: { type: [contributionPeriodSchema], default: [], immutable: true },
    collectedAt: { type: Date, required: true, immutable: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

githubDataSnapshotSchema.index(
  { identity: 1, collectedAt: -1 },
  { name: 'github_data_snapshots_identity_collected' },
);

const GitHubDataSnapshot = model<GitHubDataSnapshotRecord>(
  'GitHubDataSnapshot',
  githubDataSnapshotSchema,
);

export default GitHubDataSnapshot;
