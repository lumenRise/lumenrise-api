import type { Types } from 'mongoose';

import GitLabProjectFact from '../../../../models/GitLabProjectFact.js';
import type { GitLabCollectedProject } from '../../../../types/reputation/gitlab.js';

const storeGitLabProjectFacts = async (
  snapshotId: Types.ObjectId,
  identityId: Types.ObjectId,
  providerAccountId: string,
  projects: GitLabCollectedProject[],
  collectedAt: Date,
): Promise<void> => {
  const facts = projects.map(({ project, owned, contributed }) => ({
    snapshot: snapshotId,
    identity: identityId,
    providerAccountId,
    projectId: project.id.toString(),
    nameWithNamespace: project.name_with_namespace,
    pathWithNamespace: project.path_with_namespace,
    namespaceKind: project.namespace.kind,
    visibility: project.visibility,
    isOwned: owned,
    isContributed: contributed,
    isFork: Boolean(project.forked_from_project),
    isArchived: project.archived,
    starCount: project.star_count,
    forkCount: project.forks_count,
    openIssueCount: project.open_issues_count,
    topics: project.topics ?? [],
    webUrl: project.web_url,
    description: project.description,
    projectCreatedAt: new Date(project.created_at),
    lastActivityAt: new Date(project.last_activity_at),
    collectedAt,
  }));

  for (let index = 0; index < facts.length; index += 500) {
    await GitLabProjectFact.insertMany(facts.slice(index, index + 500));
  }
};

export { storeGitLabProjectFacts };
