import type { Types } from 'mongoose';

import GitHubRepositoryFact from '../../../../models/GitHubRepositoryFact.js';
import type { GitHubRepositoryNode } from '../../../../types/reputation/github.js';

const storeRepositoryFacts = async (
  snapshotId: Types.ObjectId,
  identityId: Types.ObjectId,
  providerAccountId: string,
  repositories: GitHubRepositoryNode[],
  collectedAt: Date,
): Promise<void> => {
  const facts = repositories.map((repository) => ({
    snapshot: snapshotId,
    identity: identityId,
    providerAccountId,
    repositoryId: repository.databaseId.toString(),
    nameWithOwner: repository.nameWithOwner,
    isFork: repository.isFork,
    isArchived: repository.isArchived,
    starCount: repository.stargazerCount,
    forkCount: repository.forkCount,
    watcherCount: repository.watchers.totalCount,
    openIssueCount: repository.issues.totalCount,
    mergedPullRequestCount: repository.pullRequests.totalCount,
    releaseCount: repository.releases.totalCount,
    primaryLanguage: repository.primaryLanguage?.name ?? null,
    repositoryCreatedAt: new Date(repository.createdAt),
    lastPushedAt: repository.pushedAt ? new Date(repository.pushedAt) : null,
    collectedAt,
  }));

  for (let index = 0; index < facts.length; index += 500) {
    await GitHubRepositoryFact.insertMany(facts.slice(index, index + 500));
  }
};

export { storeRepositoryFacts };
