import { Schema, model } from 'mongoose';

import type { GitLabProjectFactRecord } from '../types/reputation/gitlab.js';

const gitlabProjectFactSchema = new Schema<GitLabProjectFactRecord>(
  {
    snapshot: { type: Schema.Types.ObjectId, ref: 'GitLabDataSnapshot', required: true },
    identity: { type: Schema.Types.ObjectId, ref: 'Identity', required: true },
    providerAccountId: { type: String, required: true },
    projectId: { type: String, required: true },
    nameWithNamespace: { type: String, required: true },
    pathWithNamespace: { type: String, required: true },
    namespaceKind: { type: String, required: true },
    visibility: { type: String, enum: ['private', 'internal', 'public'], required: true },
    isOwned: { type: Boolean, required: true },
    isContributed: { type: Boolean, required: true },
    isFork: { type: Boolean, required: true },
    isArchived: { type: Boolean, required: true },
    starCount: { type: Number, required: true },
    forkCount: { type: Number, required: true },
    openIssueCount: { type: Number, required: true },
    topics: { type: [String], default: [] },
    webUrl: { type: String, required: true },
    description: { type: String, default: null },
    projectCreatedAt: { type: Date, required: true },
    lastActivityAt: { type: Date, required: true },
    collectedAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

gitlabProjectFactSchema.index(
  { snapshot: 1, projectId: 1 },
  { unique: true, name: 'gitlab_project_facts_snapshot_project_unique' },
);
gitlabProjectFactSchema.index(
  { identity: 1, collectedAt: -1 },
  { name: 'gitlab_project_facts_identity_collected' },
);

const GitLabProjectFact = model<GitLabProjectFactRecord>(
  'GitLabProjectFact',
  gitlabProjectFactSchema,
);

export default GitLabProjectFact;
