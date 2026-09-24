import type { Types } from 'mongoose';

import GitLabEventFact from '../../../../models/GitLabEventFact.js';
import type { GitLabEvent } from '../../../../types/reputation/gitlab.js';

const storeGitLabEventFacts = async (
  snapshotId: Types.ObjectId,
  identityId: Types.ObjectId,
  providerAccountId: string,
  events: GitLabEvent[],
  collectedAt: Date,
): Promise<void> => {
  const facts = events.map((event) => ({
    snapshot: snapshotId,
    identity: identityId,
    providerAccountId,
    eventId: event.id.toString(),
    projectId: event.project_id?.toString() ?? null,
    actionName: event.action_name,
    targetId: event.target_id?.toString() ?? null,
    targetIid: event.target_iid?.toString() ?? null,
    targetType: event.target_type,
    targetTitle: event.target_title,
    commitCount: event.push_data?.commit_count ?? null,
    refType: event.push_data?.ref_type ?? null,
    ref: event.push_data?.ref ?? null,
    eventCreatedAt: new Date(event.created_at),
    collectedAt,
  }));

  for (let index = 0; index < facts.length; index += 500) {
    await GitLabEventFact.insertMany(facts.slice(index, index + 500));
  }
};

export { storeGitLabEventFacts };
