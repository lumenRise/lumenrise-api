import type { Types } from 'mongoose';

import type { GitLabUser } from '../../types/integration/gitlab.js';
import GitLabDataSnapshot from '../../models/GitLabDataSnapshot.js';
import type { GitLabDataSnapshotDocument } from '../../types/reputation/gitlab.js';
import { buildGitLabMetrics } from '../../utils/services/reputation/gitlabData/buildGitLabMetrics.js';
import { collectGitLabEvents } from '../../utils/services/reputation/gitlabData/collectGitLabEvents.js';
import { mergeGitLabProjects } from '../../utils/services/reputation/gitlabData/mergeGitLabProjects.js';
import { storeGitLabEventFacts } from '../../utils/services/reputation/gitlabData/storeGitLabEventFacts.js';
import { storeGitLabProjectFacts } from '../../utils/services/reputation/gitlabData/storeGitLabProjectFacts.js';
import {
  MILLISECONDS_PER_DAY,
  GITLAB_PAGE_SIZE,
} from '../../constants/services/reputation/gitlabData.js';
import { collectOwnedGitLabProjects } from '../../utils/services/reputation/gitlabData/collectOwnedGitLabProjects.js';
import { collectGitLabAssociationCounts } from '../../utils/services/reputation/gitlabData/collectGitLabAssociationCounts.js';
import { collectContributedGitLabProjects } from '../../utils/services/reputation/gitlabData/collectContributedGitLabProjects.js';

const GITLAB_DATA_VERSION = 'gitlab-data-v1';

const collectGitLabData = async (
  identityId: Types.ObjectId,
  externalAccountId: Types.ObjectId,
  user: GitLabUser,
  accessToken: string,
  collectedAt = new Date(),
): Promise<GitLabDataSnapshotDocument> => {
  const [ownedResult, contributedResult, eventsResult, associationsResult] =
    await Promise.allSettled([
      collectOwnedGitLabProjects(user.id, accessToken),
      collectContributedGitLabProjects(user.id, accessToken),
      collectGitLabEvents(user.id, accessToken),
      collectGitLabAssociationCounts(user.id, accessToken),
    ]);

  const ownedProjects = ownedResult.status === 'fulfilled' ? ownedResult.value : [];

  const contributedProjects =
    contributedResult.status === 'fulfilled' ? contributedResult.value : [];

  const events = eventsResult.status === 'fulfilled' ? eventsResult.value : [];

  const associations = associationsResult.status === 'fulfilled' ? associationsResult.value : null;

  const projects = mergeGitLabProjects(ownedProjects, contributedProjects);

  const complete =
    ownedResult.status === 'fulfilled' &&
    contributedResult.status === 'fulfilled' &&
    eventsResult.status === 'fulfilled' &&
    associationsResult.status === 'fulfilled';

  const activityFrom = events.reduce<Date | null>((oldest, event) => {
    const createdAt = new Date(event.created_at);

    return !oldest || createdAt < oldest ? createdAt : oldest;
  }, null);

  const metrics = buildGitLabMetrics(user, projects, events, associations, collectedAt);

  const snapshot = await GitLabDataSnapshot.create({
    identity: identityId,
    externalAccount: externalAccountId,
    providerAccountId: user.id.toString(),
    username: user.username,
    status: complete ? 'complete' : 'partial',
    dataVersion: GITLAB_DATA_VERSION,
    coverage: {
      profile: true,
      projects: ownedResult.status === 'fulfilled',
      contributions:
        contributedResult.status === 'fulfilled' && eventsResult.status === 'fulfilled',
      associations: associationsResult.status === 'fulfilled',
    },
    metrics,
    activityFrom,
    activityTo: collectedAt,
    collectedAt,
  });

  await Promise.all([
    storeGitLabProjectFacts(snapshot._id, identityId, user.id.toString(), projects, collectedAt),
    storeGitLabEventFacts(snapshot._id, identityId, user.id.toString(), events, collectedAt),
  ]);

  return snapshot;
};

export {
  buildGitLabMetrics,
  collectContributedGitLabProjects,
  collectGitLabData,
  collectGitLabEvents,
  collectOwnedGitLabProjects,
  mergeGitLabProjects,
};

export { GITLAB_PAGE_SIZE, MILLISECONDS_PER_DAY };
