import type { HydratedDocument, Types } from 'mongoose';

type GitLabDataStatus = 'complete' | 'partial';
type GitLabProjectVisibility = 'private' | 'internal' | 'public';

interface GitLabProjectNamespace {
  id: number;
  name: string;
  path: string;
  kind: string;
  full_path: string;
}

interface GitLabProject {
  id: number;
  name: string;
  name_with_namespace: string;
  path_with_namespace: string;
  description: string | null;
  web_url: string;
  visibility: GitLabProjectVisibility;
  archived: boolean;
  star_count: number;
  forks_count: number;
  open_issues_count: number;
  topics: string[];
  created_at: string;
  last_activity_at: string;
  namespace: GitLabProjectNamespace;
  forked_from_project?: { id: number } | null;
}

interface GitLabPushData {
  commit_count: number;
  action: string;
  ref_type: string;
  commit_from: string | null;
  commit_to: string | null;
  ref: string | null;
  commit_title: string | null;
  ref_count?: number;
}

interface GitLabEvent {
  id: number;
  project_id: number | null;
  action_name: string;
  target_id: number | null;
  target_iid: number | null;
  target_type: string | null;
  target_title: string | null;
  author_id: number;
  created_at: string;
  push_data?: GitLabPushData;
}

interface GitLabAssociationCounts {
  groups_count: number;
  projects_count: number;
  issues_count: number;
  merge_requests_count: number;
}

interface GitLabCollectedProject {
  project: GitLabProject;
  owned: boolean;
  contributed: boolean;
}

interface GitLabDataCoverage {
  profile: boolean;
  projects: boolean;
  contributions: boolean;
  associations: boolean;
}

interface GitLabDataMetrics {
  accountAgeDays: number;
  followerCount: number;
  followingCount: number;
  reportedProjectCount: number;
  reportedGroupCount: number;
  reportedIssueCount: number;
  reportedMergeRequestCount: number;
  collectedProjectCount: number;
  ownedProjectCount: number;
  contributedProjectCount: number;
  archivedProjectCount: number;
  forkProjectCount: number;
  projectStars: number;
  projectForks: number;
  projectOpenIssues: number;
  collectedEventCount: number;
  pushEventCount: number;
  pushedCommitCount: number;
  issueEventCount: number;
  mergeRequestEventCount: number;
  noteEventCount: number;
}

interface GitLabDataSnapshotRecord {
  identity: Types.ObjectId;
  externalAccount: Types.ObjectId;
  providerAccountId: string;
  username: string;
  status: GitLabDataStatus;
  dataVersion: string;
  coverage: GitLabDataCoverage;
  metrics: GitLabDataMetrics;
  activityFrom: Date | null;
  activityTo: Date;
  collectedAt: Date;
  createdAt: Date;
}

interface GitLabProjectFactRecord {
  snapshot: Types.ObjectId;
  identity: Types.ObjectId;
  providerAccountId: string;
  projectId: string;
  nameWithNamespace: string;
  pathWithNamespace: string;
  namespaceKind: string;
  visibility: GitLabProjectVisibility;
  isOwned: boolean;
  isContributed: boolean;
  isFork: boolean;
  isArchived: boolean;
  starCount: number;
  forkCount: number;
  openIssueCount: number;
  topics: string[];
  webUrl: string;
  description: string | null;
  projectCreatedAt: Date;
  lastActivityAt: Date;
  collectedAt: Date;
  createdAt: Date;
}

interface GitLabEventFactRecord {
  snapshot: Types.ObjectId;
  identity: Types.ObjectId;
  providerAccountId: string;
  eventId: string;
  projectId: string | null;
  actionName: string;
  targetId: string | null;
  targetIid: string | null;
  targetType: string | null;
  targetTitle: string | null;
  commitCount: number | null;
  refType: string | null;
  ref: string | null;
  eventCreatedAt: Date;
  collectedAt: Date;
  createdAt: Date;
}

type GitLabDataSnapshotDocument = HydratedDocument<GitLabDataSnapshotRecord>;

export type {
  GitLabAssociationCounts,
  GitLabCollectedProject,
  GitLabDataCoverage,
  GitLabDataMetrics,
  GitLabDataSnapshotDocument,
  GitLabDataSnapshotRecord,
  GitLabDataStatus,
  GitLabEvent,
  GitLabEventFactRecord,
  GitLabProject,
  GitLabProjectFactRecord,
  GitLabProjectVisibility,
};
