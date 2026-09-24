import type { Types } from 'mongoose';

import env from '../../env.js';
import GitLabEventFact from '../../models/GitLabEventFact.js';
import GitLabProjectFact from '../../models/GitLabProjectFact.js';
import type { GitLabUser } from '../../types/integration/gitlab.js';
import GitLabDataSnapshot from '../../models/GitLabDataSnapshot.js';
import type {
  GitLabAssociationCounts,
  GitLabCollectedProject,
  GitLabDataMetrics,
  GitLabDataSnapshotDocument,
  GitLabEvent,
  GitLabProject,
} from '../../types/reputation/gitlab.js';

const GITLAB_DATA_VERSION = 'gitlab-data-v1';
const GITLAB_PAGE_SIZE = 100;
const MILLISECONDS_PER_DAY = 86_400_000;
const getGitLabUrl = (path: string): URL => new URL(path, env.GITLAB_BASE_URL);

const getNextPageUrl = (response: Response): string | null => {
  const link = response.headers.get('link');

  if (link) {
    for (const entry of link.split(',')) {
      const match = entry.match(/<([^>]+)>;\s*rel="next"/);

      if (match?.[1]) {
        return match[1];
      }
    }
  }

  const nextPage = response.headers.get('x-next-page');

  if (!nextPage) {
    return null;
  }

  const nextUrl = new URL(response.url);

  nextUrl.searchParams.set('page', nextPage);

  return nextUrl.toString();
};
const fetchGitLabCollection = async <T>(
  path: string,
  accessToken: string,
  parameters: Record<string, string> = {},
): Promise<T[]> => {
  const initialUrl = getGitLabUrl(path);
  const items: T[] = [];

  initialUrl.searchParams.set('per_page', GITLAB_PAGE_SIZE.toString());

  for (const [key, value] of Object.entries(parameters)) {
    initialUrl.searchParams.set(key, value);
  }

  let nextUrl: string | null = initialUrl.toString();

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`GitLab collection request failed with status ${response.status}`);
    }

    const page = (await response.json()) as T[];

    items.push(...page);
    nextUrl = getNextPageUrl(response);
  }

  return items;
};

const collectOwnedGitLabProjects = async (
  userId: number,
  accessToken: string,
): Promise<GitLabProject[]> =>
  fetchGitLabCollection<GitLabProject>(`/api/v4/users/${userId}/projects`, accessToken, {
    pagination: 'keyset',
    order_by: 'id',
    sort: 'asc',
  });

const collectContributedGitLabProjects = async (
  userId: number,
  accessToken: string,
): Promise<GitLabProject[]> =>
  fetchGitLabCollection<GitLabProject>(
    `/api/v4/users/${userId}/contributed_projects`,
    accessToken,
    {
      pagination: 'keyset',
      order_by: 'id',
      sort: 'asc',
    },
  );

const collectGitLabEvents = async (
  userId: number,
  accessToken: string,
): Promise<GitLabEvent[]> =>
  fetchGitLabCollection<GitLabEvent>(`/api/v4/users/${userId}/events`, accessToken, {
    scope: 'all',
    sort: 'asc',
  });

const collectGitLabAssociationCounts = async (
  userId: number,
  accessToken: string,
): Promise<GitLabAssociationCounts> => {
  const response = await fetch(getGitLabUrl(`/api/v4/users/${userId}/associations_count`), {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`GitLab association count request failed with status ${response.status}`);
  }

  return (await response.json()) as GitLabAssociationCounts;
};

const mergeGitLabProjects = (
  ownedProjects: GitLabProject[],
  contributedProjects: GitLabProject[],
): GitLabCollectedProject[] => {
  const projects = new Map<number, GitLabCollectedProject>();

  for (const project of ownedProjects) {
    projects.set(project.id, { project, owned: true, contributed: false });
  }

  for (const project of contributedProjects) {
    const existingProject = projects.get(project.id);

    if (existingProject) {
      existingProject.contributed = true;
      continue;
    }

    projects.set(project.id, { project, owned: false, contributed: true });
  }

  return [...projects.values()];
};

const buildGitLabMetrics = (
  user: GitLabUser,
  projects: GitLabCollectedProject[],
  events: GitLabEvent[],
  associations: GitLabAssociationCounts | null,
  collectedAt: Date,
): GitLabDataMetrics => {
  const sumProjects = (value: (project: GitLabProject) => number): number =>
    projects.reduce((total, item) => total + value(item.project), 0);

  const accountAgeDays = Math.max(
    0,
    Math.floor(
      (collectedAt.getTime() - new Date(user.created_at).getTime()) / MILLISECONDS_PER_DAY,
    ),
  );

  return {
    accountAgeDays,
    followerCount: user.followers ?? 0,
    followingCount: user.following ?? 0,
    reportedProjectCount: associations?.projects_count ?? 0,
    reportedGroupCount: associations?.groups_count ?? 0,
    reportedIssueCount: associations?.issues_count ?? 0,
    reportedMergeRequestCount: associations?.merge_requests_count ?? 0,
    collectedProjectCount: projects.length,
    ownedProjectCount: projects.filter((item) => item.owned).length,
    contributedProjectCount: projects.filter((item) => item.contributed).length,
    archivedProjectCount: projects.filter((item) => item.project.archived).length,
    forkProjectCount: projects.filter((item) => item.project.forked_from_project).length,
    projectStars: sumProjects((project) => project.star_count),
    projectForks: sumProjects((project) => project.forks_count),
    projectOpenIssues: sumProjects((project) => project.open_issues_count),
    collectedEventCount: events.length,
    pushEventCount: events.filter((event) => event.push_data).length,
    pushedCommitCount: events.reduce(
      (total, event) => total + (event.push_data?.commit_count ?? 0),
      0,
    ),
    issueEventCount: events.filter((event) => event.target_type === 'Issue').length,
    mergeRequestEventCount: events.filter((event) => event.target_type === 'MergeRequest').length,
    noteEventCount: events.filter((event) => event.target_type === 'Note').length,
  };
};

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
