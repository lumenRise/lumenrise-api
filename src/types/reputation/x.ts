import type { HydratedDocument, Types } from 'mongoose';

import type { XUser } from '../integration/x.js';

type XDataStatus = 'complete' | 'partial';
type XReferencedPostType = 'replied_to' | 'quoted' | 'retweeted';

interface XPostPublicMetrics {
  retweet_count: number;
  reply_count: number;
  like_count: number;
  quote_count: number;
  bookmark_count?: number;
  impression_count?: number;
}

interface XReferencedPost {
  type: XReferencedPostType;
  id: string;
}

interface XPost {
  id: string;
  created_at?: string;
  public_metrics?: XPostPublicMetrics;
  referenced_tweets?: XReferencedPost[];
}

interface XTimelineMeta {
  result_count?: number;
  next_token?: string;
}

interface XTimelineResponse {
  data?: XPost[];
  meta?: XTimelineMeta;
  title?: string;
  detail?: string;
  errors?: Array<{ detail?: string; title?: string }>;
}

interface XDataCoverage {
  profile: boolean;
  posts: boolean;
}

interface XDataMetrics {
  accountAgeDays: number;
  followerCount: number;
  followingCount: number;
  reportedPostCount: number;
  listedCount: number;
  profileLikeCount: number;
  mediaCount: number;
  collectedPostCount: number;
  originalPostCount: number;
  replyPostCount: number;
  repostCount: number;
  quotePostCount: number;
  activeDayCount: number;
  receivedRepostCount: number;
  receivedReplyCount: number;
  receivedLikeCount: number;
  receivedQuoteCount: number;
  receivedBookmarkCount: number;
  impressionCount: number;
}

interface XDataSnapshotRecord {
  identity: Types.ObjectId;
  externalAccount: Types.ObjectId;
  providerAccountId: string;
  username: string;
  status: XDataStatus;
  dataVersion: string;
  coverage: XDataCoverage;
  metrics: XDataMetrics;
  activityFrom: Date | null;
  activityTo: Date;
  collectedAt: Date;
  createdAt: Date;
}

interface XDataSnapshotResult {
  provider: 'x';
  status: XDataStatus;
  dataVersion: string;
  username: string;
  coverage: XDataCoverage;
  metrics: XDataMetrics;
  activityFrom: string | null;
  activityTo: string;
  collectedAt: string;
}

type XDataSnapshotDocument = HydratedDocument<XDataSnapshotRecord>;

export type {
  XDataCoverage,
  XDataMetrics,
  XDataSnapshotDocument,
  XDataSnapshotRecord,
  XDataSnapshotResult,
  XDataStatus,
  XPost,
  XPostPublicMetrics,
  XReferencedPost,
  XReferencedPostType,
  XTimelineMeta,
  XTimelineResponse,
  XUser,
};
