import type { Types } from 'mongoose';

import XDataSnapshot from '../../models/XDataSnapshot.js';
import type { XUser } from '../../types/integration/x.js';
import XRateLimitError from '../integration/xRateLimit.js';
import XApiResponseError from '../integration/xApiResponseError.js';
import type {
  XDataMetrics,
  XDataSnapshotDocument,
  XPost,
  XTimelineResponse,
} from '../../types/reputation/x.js';

const X_DATA_VERSION = 'x-data-v1';
const X_TIMELINE_PAGE_SIZE = 100;
const MILLISECONDS_PER_DAY = 86_400_000;

const getXTimelineUrl = (userId: string, paginationToken?: string): URL => {
  const url = new URL(`https://api.x.com/2/users/${userId}/tweets`);

  url.searchParams.set('max_results', X_TIMELINE_PAGE_SIZE.toString());
  url.searchParams.set('tweet.fields', 'created_at,public_metrics,referenced_tweets');

  if (paginationToken) {
    url.searchParams.set('pagination_token', paginationToken);
  }

  return url;
};

const collectXPosts = async (userId: string, accessToken: string): Promise<XPost[]> => {
  const posts: XPost[] = [];
  const observedPaginationTokens = new Set<string>();

  let paginationToken: string | undefined;

  do {
    const response = await fetch(getXTimelineUrl(userId, paginationToken), {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 429) {
      throw new XRateLimitError(response);
    }

    const result = (await response.json()) as XTimelineResponse;

    if (!response.ok) {
      throw new XApiResponseError(
        response.status,
        'timeline request',
        result.errors?.[0]?.detail ??
          result.errors?.[0]?.title ??
          result.detail ??
          result.title ??
          'Unknown X API error',
      );
    }

    posts.push(...(result.data ?? []));

    const nextToken = result.meta?.next_token;

    if (!nextToken) {
      paginationToken = undefined;
      continue;
    }

    if (observedPaginationTokens.has(nextToken)) {
      throw new Error('X timeline returned a repeated pagination token');
    }

    observedPaginationTokens.add(nextToken);
    paginationToken = nextToken;
  } while (paginationToken);

  return posts;
};
const buildXMetrics = (user: XUser, posts: XPost[], collectedAt: Date): XDataMetrics => {
  const publicMetrics = user.public_metrics;
  const activeDays = new Set<string>();
  const accountCreatedAt = user.created_at ? new Date(user.created_at) : collectedAt;
  const accountAgeDays = Math.max(
    0,
    Math.floor((collectedAt.getTime() - accountCreatedAt.getTime()) / MILLISECONDS_PER_DAY),
  );

  let originalPostCount = 0;
  let replyPostCount = 0;
  let repostCount = 0;
  let quotePostCount = 0;
  let receivedRepostCount = 0;
  let receivedReplyCount = 0;
  let receivedLikeCount = 0;
  let receivedQuoteCount = 0;
  let receivedBookmarkCount = 0;
  let impressionCount = 0;

  for (const post of posts) {
    const references = post.referenced_tweets ?? [];
    const metrics = post.public_metrics;

    if (references.some((reference) => reference.type === 'retweeted')) {
      repostCount += 1;
    } else if (references.some((reference) => reference.type === 'replied_to')) {
      replyPostCount += 1;
    } else if (references.some((reference) => reference.type === 'quoted')) {
      quotePostCount += 1;
    } else {
      originalPostCount += 1;
    }

    if (post.created_at) {
      activeDays.add(post.created_at.slice(0, 10));
    }

    receivedRepostCount += metrics?.retweet_count ?? 0;
    receivedReplyCount += metrics?.reply_count ?? 0;
    receivedLikeCount += metrics?.like_count ?? 0;
    receivedQuoteCount += metrics?.quote_count ?? 0;
    receivedBookmarkCount += metrics?.bookmark_count ?? 0;
    impressionCount += metrics?.impression_count ?? 0;
  }

  return {
    accountAgeDays,
    followerCount: publicMetrics?.followers_count ?? 0,
    followingCount: publicMetrics?.following_count ?? 0,
    reportedPostCount: publicMetrics?.tweet_count ?? 0,
    listedCount: publicMetrics?.listed_count ?? 0,
    profileLikeCount: publicMetrics?.like_count ?? 0,
    mediaCount: publicMetrics?.media_count ?? 0,
    collectedPostCount: posts.length,
    originalPostCount,
    replyPostCount,
    repostCount,
    quotePostCount,
    activeDayCount: activeDays.size,
    receivedRepostCount,
    receivedReplyCount,
    receivedLikeCount,
    receivedQuoteCount,
    receivedBookmarkCount,
    impressionCount,
  };
};

const collectXData = async (
  identityId: Types.ObjectId,
  externalAccountId: Types.ObjectId,
  user: XUser,
  accessToken: string,
  collectedAt = new Date(),
): Promise<XDataSnapshotDocument> => {
  const posts = await collectXPosts(user.id, accessToken);
  const activityFrom = posts.reduce<Date | null>((oldest, post) => {
    if (!post.created_at) {
      return oldest;
    }

    const createdAt = new Date(post.created_at);

    return !oldest || createdAt < oldest ? createdAt : oldest;
  }, null);

  const metrics = buildXMetrics(user, posts, collectedAt);

  return XDataSnapshot.create({
    identity: identityId,
    externalAccount: externalAccountId,
    providerAccountId: user.id,
    username: user.username,
    status: 'complete',
    dataVersion: X_DATA_VERSION,
    coverage: {
      profile: true,
      posts: true,
    },
    metrics,
    activityFrom,
    activityTo: collectedAt,
    collectedAt,
  });
};

export { buildXMetrics, collectXData, collectXPosts };
