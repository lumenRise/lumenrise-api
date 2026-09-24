import { Schema, model } from 'mongoose';

import type { GitLabEventFactRecord } from '../types/reputation/gitlab.js';

const gitlabEventFactSchema = new Schema<GitLabEventFactRecord>(
  {
    snapshot: { type: Schema.Types.ObjectId, ref: 'GitLabDataSnapshot', required: true },
    identity: { type: Schema.Types.ObjectId, ref: 'Identity', required: true },
    providerAccountId: { type: String, required: true },
    eventId: { type: String, required: true },
    projectId: { type: String, default: null },
    actionName: { type: String, required: true },
    targetId: { type: String, default: null },
    targetIid: { type: String, default: null },
    targetType: { type: String, default: null },
    targetTitle: { type: String, default: null },
    commitCount: { type: Number, default: null },
    refType: { type: String, default: null },
    ref: { type: String, default: null },
    eventCreatedAt: { type: Date, required: true },
    collectedAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

gitlabEventFactSchema.index(
  { snapshot: 1, eventId: 1 },
  { unique: true, name: 'gitlab_event_facts_snapshot_event_unique' },
);

gitlabEventFactSchema.index(
  { identity: 1, eventCreatedAt: -1 },
  { name: 'gitlab_event_facts_identity_event_created' },
);

const GitLabEventFact = model<GitLabEventFactRecord>(
  'GitLabEventFact',
  gitlabEventFactSchema,
);

export default GitLabEventFact;
