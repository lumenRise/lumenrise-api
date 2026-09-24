import type { GitLabUser } from '../../../../types/integration/gitlab.js';
import { MILLISECONDS_PER_DAY } from '../../../../constants/services/reputation/gitlabData.js';
import type {
  GitLabAssociationCounts,
  GitLabCollectedProject,
  GitLabDataMetrics,
  GitLabEvent,
  GitLabProject,
} from '../../../../types/reputation/gitlab.js';

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

export { buildGitLabMetrics };
