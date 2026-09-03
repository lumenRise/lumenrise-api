import { Schema, model } from 'mongoose';

import type { GitHubRepositoryFactRecord } from '../types/reputation/github.js';

const githubRepositoryFactSchema = new Schema<GitHubRepositoryFactRecord>(
  {
    snapshot: { type: Schema.Types.ObjectId, ref: 'GitHubDataSnapshot', required: true },
    identity: { type: Schema.Types.ObjectId, ref: 'Identity', required: true },
    providerAccountId: { type: String, required: true },
    repositoryId: { type: String, required: true },
    nameWithOwner: { type: String, required: true },
    isFork: { type: Boolean, required: true },
    isArchived: { type: Boolean, required: true },
    starCount: { type: Number, required: true },
    forkCount: { type: Number, required: true },
    watcherCount: { type: Number, required: true },
    openIssueCount: { type: Number, required: true },
    mergedPullRequestCount: { type: Number, required: true },
    releaseCount: { type: Number, required: true },
    primaryLanguage: { type: String, default: null },
    repositoryCreatedAt: { type: Date, required: true },
    lastPushedAt: { type: Date, default: null },
    collectedAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

githubRepositoryFactSchema.index(
  { snapshot: 1, repositoryId: 1 },
  { unique: true, name: 'github_repository_facts_snapshot_repository_unique' },
);
githubRepositoryFactSchema.index(
  { identity: 1, collectedAt: -1 },
  { name: 'github_repository_facts_identity_collected' },
);

const GitHubRepositoryFact = model<GitHubRepositoryFactRecord>(
  'GitHubRepositoryFact',
  githubRepositoryFactSchema,
);

export default GitHubRepositoryFact;
